# SK Accessories - Smart Hardware Inventory Management System

Inventory, purchasing and invoicing for a modular kitchen / wardrobe / furniture hardware business (Sleek, Ebco and any brand you add).
Plain HTML, CSS and vanilla JavaScript on the front end; Node.js, Express and MongoDB (Mongoose) on the back end. No frontend framework.

## Run it

1. Install Node.js 18+ and MongoDB (local, or a MongoDB Atlas connection string).
2. In this folder:
   ```bash
   npm install
   cp .env.example .env        # then edit .env (set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI)
   npm start
   ```
3. Open http://localhost:3000 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
   The first administrator is created automatically the first time the app starts with an empty database.
   Change the password under Settings afterwards.
4. Optional sample data (8 placeholder products with variants, 2 suppliers): `npm run seed:demo`

Brands (Sleek, Ebco) and four starter categories are created on first start. Add, rename or delete them from **Brands & Categories**.

## What is in it

| Area | What it does |
|---|---|
| Dashboard | Animated KPIs (products, units, low stock, out of stock, inventory value, today's sales), sales vs purchases chart (7/30 days), stock value by brand, restock list with one-click stock-in, recent sales, purchases and live activity. Updates itself when anyone changes stock (server-sent events). |
| Products | Add, edit, delete, search, filter by brand/category/stock level; card and table views; image upload; dimensions, material, finish, prices, minimum stock; variants (size / finish / configuration) each with their own SKU, prices, stock and minimum. |
| Inventory | Stock in, stock out, adjustment (enter the counted quantity), damaged, customer return, return to supplier. Every change is logged with the balance after it. |
| Purchases | Supplier, supplier invoice number, line items; saving adds the stock and logs it. |
| Sales & invoices | Customer details, line items with stock check, discount, GST %, payment mode; printable invoice; admins can cancel an invoice and the stock goes back. |
| Suppliers | Contact, GSTIN, address. |
| Reports | Inventory, low stock, brand-wise stock, purchases, sales (with gross profit). Preview on screen and download as Excel. |
| Settings | Business details for invoices, change password, add/remove users (admin or staff). |

**Roles.** Administrators can manage products, brands, categories, suppliers, users and cancel invoices. Staff can view everything and record stock movements, purchases and sales.

## How stock stays accurate

- Every quantity change goes through one function (`server/stock.js`) that uses MongoDB atomic updates, so two people selling the same item at once cannot push stock below zero.
- A product with variants keeps its total as the sum of its variants. Without variants, the product itself holds the quantity.
- Purchases and invoices with several lines are rolled back automatically if any line fails (for example, not enough stock).
- Existing quantities are not editable on the product form; they only change through Inventory, purchases and sales, so the history is complete.
- Low stock means quantity is at or below the minimum (and above zero); out of stock means zero. Alerts are counted per SKU/variant.

## Security

Passwords are hashed with bcrypt; sign-in uses JWT (12 h) and is rate-limited; helmet sets a strict Content-Security-Policy (no inline scripts); all user content is HTML-escaped; request bodies are whitelisted before saving; write actions are role-checked on the server, not just hidden in the UI.
Before going live: set a long random `JWT_SECRET`, change the default admin password, and serve the app over HTTPS (for example behind nginx or a hosting platform).

## Project layout

```
server/            index.js (app + security), models.js, stock.js (inventory engine), seed.js
server/routes/     auth, products, inventory, purchases, sales, masters (brands/categories/suppliers),
                   dashboard, reports (JSON + Excel), settings
public/            index.html, css/style.css
public/js/         app.js (router, shell, live updates), api.js, ui.js (modals, toasts, helpers),
                   charts.js (canvas charts), picker.js (item search + invoice lines)
public/js/pages/   dashboard, products, inventory, purchases, sales, suppliers, masters, reports, settings
```

## Notes

- Product images are resized in the browser and stored in MongoDB as small data URLs. For thousands of high-resolution photos, move them to file/object storage.
- The page loads the Manrope font from Google Fonts; without internet it falls back to the system font.
- Prices use the Indian rupee and Indian number formatting. Change the currency in `public/js/ui.js` (`inr`) if needed.
