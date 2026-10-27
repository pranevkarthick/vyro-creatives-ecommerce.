# Vyro Creatives Admin Dashboard Setup

The admin dashboard is already included in this source project. It is protected by server-side authentication and an `admin` role.

## 1. Create your admin login

1. Copy `.env.example` to a file named `.env` in the project root (same folder as `server.js`).
2. Set your own values, for example:

```dotenv
SESSION_SECRET=replace-with-a-long-random-secret
ADMIN_NAME=Vyro Admin
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=use-a-long-unique-password
```

3. Start the server. On first startup, it creates the admin account if that email does not already exist.
4. Open `http://localhost:3000`, sign in using the admin email/password, then open the account menu to access the dashboard.

Do not use the example password in a real deployment. Never share or commit `.env`.

## 2. Upload your UPI QR

In the admin dashboard, open **Settings** and upload a JPG, PNG, or WebP QR image (up to 5 MB), then save. The image is stored under `/uploads` and the setting is saved in SQLite. Customers can choose manual UPI QR at checkout.

**Manual verification:** A static QR image does not confirm that a payment reached your account. Orders remain pending review until you check your bank/UPI app independently and mark the payment as paid in the dashboard. Do not trust a screenshot alone.

## 3. Manage orders

Open **Orders** to review the order ID, customer name/email, total, payment status, and fulfilment status. Use the order-status dropdown to update progress. Use the payment-status dropdown only after checking the actual transaction. The dashboard asks for confirmation before marking a payment as paid.

## 4. Create referral codes

Open **Referrals** and enter a custom code or leave the code blank for automatic generation. Choose a discount percentage (1–80%) and optionally set a maximum number of uses. Create the code, then enable/disable it from the referral list. Discounts are validated and calculated server-side at checkout.

## 5. Start locally

Use Node.js 22 LTS on Windows for the best compatibility with the project's current `better-sqlite3` dependency. From this project folder:

```powershell
npm.cmd install
npm.cmd start
```

If `better-sqlite3` fails to build, install Visual Studio Build Tools with the **Desktop development with C++** workload, or use a supported Node.js version with a matching prebuilt binary. Do not run `npm start` until `npm install` finishes successfully.

This is a starter project. Review security, backups, HTTPS, access controls, payment webhooks, and local legal/tax requirements before public launch.

## Manually change product prices
1. Sign in with an admin account and open **Admin dashboard → Products**.
2. Find the product and edit its **Price (₹)** field. Decimal amounts such as `249.50` are supported.
3. Click **Save price**. The server validates the amount and saves it in the database.
4. The storefront refreshes its product list after saving. New orders use the updated price; existing orders keep the totals recorded when they were created.

Only signed-in admin accounts can update product prices. Do not expose admin credentials or `.env` secrets.
