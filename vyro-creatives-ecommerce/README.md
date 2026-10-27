# Vyro Creatives — Full-Stack E-commerce Starter

This is a runnable full-stack website source project for a small digital design shop. It includes:
- Responsive storefront, service sections and portfolio
- Product catalogue backed by SQLite
- Shopping cart and server-calculated checkout totals
- Customer registration/login with bcrypt password hashing and sessions
- Customer order history for orders linked to signed-in accounts
- Public order tracking using generated order ID plus checkout email
- Customer-facing UPI QR display in order tracking and account order history
- Admin-only dashboard (server-enforced role checks)
- Admin product creation with image upload, product activation/deactivation
- Referral-code creation, limits and server-side discount calculation
- Razorpay order creation, signature verification and webhook processing
- Manual UPI QR upload and payment-review status
- Order status and payment status management

## Requirements
- Node.js 22.x (pinned in `.node-version` for Render/native SQLite compatibility)
- npm
- A server/host that supports Node.js and persistent disk storage

## Run locally
1. Extract the ZIP.
2. Copy `.env.example` to `.env`.
3. Change `SESSION_SECRET` to a long random secret.
4. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD`.
5. Open a terminal in this folder and run:

```bash
npm install
npm start
```

6. Open `http://localhost:3000`.
7. Sign in using the admin credentials from `.env`.

The first start creates the admin account only if the email does not already exist. If you change the password in `.env` later, the existing admin password is not automatically updated; change it through a future password-management feature or update the database securely.

## Configure Razorpay
1. Create/verify your merchant account directly with Razorpay.
2. Start in Test Mode and create test API keys.
3. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env`.
4. Configure a webhook URL such as `https://YOUR-DOMAIN/api/webhooks/razorpay` and set its secret in `RAZORPAY_WEBHOOK_SECRET`.
5. Subscribe to at least `payment.captured`, `payment.failed`, and `order.paid` events.
6. Restart the server and test the full flow before using live credentials.

Important: the frontend never receives the Razorpay secret. The server creates payment orders and verifies the checkout signature. The webhook verifies its signature against the raw request body. Payment is only marked paid after a verified capture/paid webhook or a manual admin verification.

## Configure manual UPI QR
Sign in as admin → Settings / UPI QR → upload a QR image. The image is stored in the server `uploads/` directory and its URL is saved in SQLite. Customers can see the current QR at checkout and when tracking an order; signed-in customers can also see it in My orders. Such orders remain pending review; only mark them paid in the admin dashboard after independently confirming receipt in your bank/UPI app.

## Customer order tracking
Use the **Track order** button in the site header. Customers enter the generated order ID (for example, `VY-1A2B3C4D`) and the email address used at checkout. The API returns only limited tracking details and the current order/payment status. The email match helps prevent order-ID-only lookups.

## Important production checklist
This is a functional starter, not a substitute for a security review. Before public launch:
- Deploy only over HTTPS; set `NODE_ENV=production`, a strong unique `SESSION_SECRET`, and correct `BASE_URL`.
- On Render, attach a persistent disk mounted at `/var/data`, then set both `DATA_DIR=/var/data` and `UPLOADS_DIR=/var/data/uploads` in the service environment. This keeps the SQLite database, uploaded UPI QR and product images across deploys. Render filesystems are ephemeral without a persistent disk, so configure persistence and backups before taking real orders.
- Add rate limiting, CSRF protection appropriate to your deployment, email verification, password reset, account lockout and audit logs.
- Add order ownership checks and a dedicated customer order detail endpoint before exposing additional order data.
- Add stock/fulfilment rules if you sell physical products.
- Add cancellation, refunds, privacy policy, terms, contact details and customer support workflows.
- Verify payment webhooks and idempotency behaviour in Razorpay test mode; inspect logs and test duplicate/retried webhook delivery.
- Never commit `.env` or share secret keys. Use environment variables/secrets in hosting.
- Replace stock imagery and Instagram links with assets/URLs you own.
- Review Indian tax, invoicing, consumer protection and merchant onboarding requirements with an appropriate professional.

## Main structure
- `server.js` — Express API, SQLite database, authentication, orders, referrals, Razorpay and admin routes
- `public/index.html` — storefront structure
- `public/styles.css` — responsive visual system
- `public/app.js` — cart, checkout, account and admin dashboard interactions
- `.env.example` — configuration template
