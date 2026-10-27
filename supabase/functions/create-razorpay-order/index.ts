// Supabase Edge Function scaffold: create-razorpay-order
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
// Keep service-role and Razorpay secrets in Supabase secrets only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://your-domain.example",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!supabaseUrl || !serviceKey || !keyId || !keySecret) {
    return Response.json({ error: "Payment provider is not configured." }, { status: 503, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return Response.json({ error: "Sign in required." }, { status: 401, headers: corsHeaders });
    const supabase = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return Response.json({ error: "Invalid session." }, { status: 401, headers: corsHeaders });

    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length || items.length > 20) return Response.json({ error: "Invalid cart." }, { status: 400, headers: corsHeaders });

    // Never accept price from browser. Re-read each active product price from database.
    const ids = [...new Set(items.map((i: any) => String(i.productId)))];
    if (ids.some((id: string) => !/^[0-9a-f-]{36}$/i.test(id))) {
      return Response.json({ error: "Invalid product ID." }, { status: 400, headers: corsHeaders });
    }
    const { data: products, error: productError } = await supabase
      .from("products").select("id,name,price_paise,active").in("id", ids);
    if (productError || !products || products.length !== ids.length || products.some(p => !p.active)) {
      return Response.json({ error: "One or more products are unavailable." }, { status: 400, headers: corsHeaders });
    }
    const productMap = new Map(products.map(p => [p.id, p]));
    let subtotal = 0;
    const validatedItems = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      const product = productMap.get(String(item.productId));
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return Response.json({ error: "Invalid cart quantity." }, { status: 400, headers: corsHeaders });
      }
      subtotal += product.price_paise * quantity;
      validatedItems.push({ product_id: product.id, product_name: product.name, quantity, unit_price_paise: product.price_paise, customization: {} });
    }
    if (!Number.isSafeInteger(subtotal) || subtotal < 1 || subtotal > 50000000) {
      return Response.json({ error: "Order amount is outside the permitted range." }, { status: 400, headers: corsHeaders });
    }

    // Referral discounts must be computed and validated server-side before adding discount logic here.
    const total = subtotal;
    const { data: profile } = await supabase.from("profiles").select("full_name,phone,instagram_handle").eq("id", user.id).maybeSingle();
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      order_number: "VY-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      customer_id: user.id,
      customer_name: body.customerName || profile?.full_name || user.email || "Customer",
      customer_email: user.email || body.customerEmail,
      customer_phone: body.customerPhone || profile?.phone || null,
      instagram_handle: body.instagramHandle || profile?.instagram_handle || null,
      design_brief: String(body.designBrief || "").slice(0, 5000),
      required_text: String(body.requiredText || "").slice(0, 2000),
      preferred_style: String(body.preferredStyle || "").slice(0, 80),
      output_format: String(body.outputFormat || "").slice(0, 80),
      deadline: body.deadline || null,
      subtotal_paise: subtotal,
      discount_paise: 0,
      total_paise: total,
      status: "awaiting_payment",
      payment_status: "pending",
      payment_method: "razorpay",
    }).select("id,order_number,total_paise").single();
    if (orderError || !order) throw new Error("Could not create order.");

    const { error: itemsError } = await supabase.from("order_items").insert(validatedItems.map(i => ({ ...i, order_id: order.id })));
    if (itemsError) throw new Error("Could not save order items.");

    const rpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Authorization": "Basic " + btoa(`${keyId}:${keySecret}`), "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total, currency: "INR", receipt: order.order_number, notes: { internal_order_id: order.id } }),
    });
    const rp = await rpResponse.json();
    if (!rpResponse.ok) throw new Error("Payment provider could not create the order.");

    const { error: paymentError } = await supabase.from("payments").insert({
      order_id: order.id, provider: "razorpay", provider_order_id: rp.id,
      amount_paise: total, currency: "INR", status: "pending"
    });
    if (paymentError) throw new Error("Could not save payment reference.");

    return Response.json({
      orderId: order.id, orderNumber: order.order_number, amount: total,
      currency: "INR", razorpayOrderId: rp.id, keyId
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("create-razorpay-order error", error);
    return Response.json({ error: "Unable to create checkout order." }, { status: 500, headers: corsHeaders });
  }
});
