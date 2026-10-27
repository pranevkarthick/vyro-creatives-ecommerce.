// Supabase Edge Function scaffold: verify-razorpay-payment
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// RAZORPAY_KEY_SECRET. Verify signatures server-side; webhooks should be
// the source of truth for asynchronous payment state and must be idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://your-domain.example",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!supabaseUrl || !serviceKey || !keySecret) return Response.json({ error: "Payment verification is not configured." }, { status: 503, headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return Response.json({ error: "Sign in required." }, { status: 401, headers: corsHeaders });
    const supabase = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return Response.json({ error: "Invalid session." }, { status: 401, headers: corsHeaders });
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = body;
    if (![razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id].every((v: unknown) => typeof v === "string" && v.length < 256)) {
      return Response.json({ error: "Invalid payment response." }, { status: 400, headers: corsHeaders });
    }

    const { data: payment } = await supabase.from("payments").select("id,order_id,provider_order_id,amount_paise,status").eq("provider_order_id", razorpay_order_id).maybeSingle();
    if (!payment || payment.order_id !== order_id) return Response.json({ error: "Payment order mismatch." }, { status: 400, headers: corsHeaders });
    const { data: order } = await supabase.from("orders").select("id,customer_id,total_paise").eq("id", order_id).maybeSingle();
    if (!order || order.customer_id !== user.id || order.total_paise !== payment.amount_paise) {
      return Response.json({ error: "Order verification failed." }, { status: 400, headers: corsHeaders });
    }
    const expected = await hmacHex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (!constantTimeEqual(expected, razorpay_signature)) return Response.json({ error: "Payment signature is invalid." }, { status: 400, headers: corsHeaders });

    // Signature proves checkout response integrity. Webhook/payment fetch should confirm capture before final paid status.
    const { error: updateError } = await supabase.from("payments").update({
      provider_payment_id: razorpay_payment_id, status: "authorized", verified_at: new Date().toISOString()
    }).eq("id", payment.id);
    if (updateError) throw updateError;
    return Response.json({ verified: true, status: "authorized", message: "Signature verified. Await server-confirmed capture/webhook before marking paid." }, { headers: corsHeaders });
  } catch (error) {
    console.error("verify-razorpay-payment error", error);
    return Response.json({ error: "Unable to verify payment." }, { status: 500, headers: corsHeaders });
  }
});
