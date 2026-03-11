# 🚢 Deployment Guide — Auto Parts Hunt

This document explains exactly how to deploy Auto Parts Hunt for live access using **npx serve** and **ngrok**.

---

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| Node.js | Required to run `npx serve` | [nodejs.org](https://nodejs.org) |
| ngrok | Creates public HTTPS tunnel | [ngrok.com/download](https://ngrok.com/download) |

### Configure ngrok (one-time setup)
1. Sign up at [ngrok.com](https://ngrok.com)
2. Copy your authtoken from the dashboard
3. Run:
```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

---

## Deployment Steps

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/auto-parts-hunt.git
cd auto-parts-hunt
```

### 2. Start the local file server
```bash
npx serve "Auto Parts" -l 3000
```
Expected output:
```
Serving!
- Local:    http://localhost:3000
- Network:  http://YOUR_IP:3000
```

### 3. Start the ngrok tunnel (new terminal)
```bash
ngrok http 3000
```
Expected output:
```
Session Status    online
Account           mashokoterrence1@gmail.com (Plan: Free)
Region            India (in)
Latency           77ms
Forwarding        https://xxxx-xxxx.ngrok-free.dev → http://localhost:3000
```

### 4. Share the public URL
Copy the `Forwarding` URL from the ngrok output and share it. Anyone with the link can access the app.

### 5. Monitor live traffic
Open `http://127.0.0.1:4040` in your browser — this is the ngrok web dashboard showing all incoming HTTP requests in real time.

---

## Observed Response Times

| Request Type | Status | Response Time |
|-------------|--------|---------------|
| HTML pages (first load) | 200 OK | 1–2 ms |
| CSS / JS / images (cached) | 304 Not Modified | 1 ms |
| Supabase API (warm) | 200 OK | 180–400 ms |
| Supabase API (cold start) | 200 OK | 800–1500 ms |

---

## Known Limitations

| Limitation | Details |
|-----------|---------|
| ngrok URL changes | On the free plan, the public URL is regenerated every time ngrok restarts. Share the new URL after each restart. |
| Both terminals must stay open | Closing either the `npx serve` or `ngrok` terminal takes the app offline. |
| Supabase cold start | If the DB hasn't been queried in a while, the first request takes ~1s. Subsequent requests are fast. |
| Plain-text passwords | Passwords are stored unhashed — prototype only, not for production. |

---

## Database Setup (if starting fresh)

If you are using a new Supabase project, create the following tables:
```sql
-- Users
create table users (
  id text primary key,
  fname text, lname text, email text unique,
  password text, role text, city text,
  phone text, active boolean, joined text
);

-- Shops
create table shops (
  id text primary key, user_id text,
  name text, owner text, city text, phone text,
  address text, description text,
  verified boolean, active boolean, joined text
);

-- Parts
create table parts (
  id text primary key, shop_id text, shop_name text,
  name text, no text, make text, model text, year text,
  cat text, cond text, price numeric, stock integer,
  description text, img text, active boolean
);

-- Orders
create table orders (
  id text primary key, customer_id text, customer_name text,
  customer_phone text, part_id text, part_name text,
  shop_id text, shop_name text, qty integer, total numeric,
  unit_price numeric, status text, reviewed boolean,
  date text, timestamp bigint
);

-- Reviews
create table reviews (
  id text primary key, order_id text, part_id text,
  part_name text, shop_id text, shop_name text,
  customer_id text, customer_name text,
  rating integer, comment text, date text, timestamp bigint
);
```

Then update `app_state.js` with your new Supabase project URL and key.

---

## Upgrade Path (future)

If a permanent URL is needed (no ngrok restart issue), the recommended upgrade path is:

1. Deploy frontend to **Vercel** — drag and drop the `Auto Parts` folder, select "No Framework"
2. Keep **Supabase** as the backend — zero code changes required
3. All absolute paths (`/Login/`, `/customer/`, `/admin/`) resolve correctly on Vercel

This requires no changes to any HTML, CSS, or JS files.
