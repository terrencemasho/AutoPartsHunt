# 🔧 Auto Parts Hunt

> A web-based marketplace for buying and selling automobile spare parts across Pakistan.

**Team:** The Recursives — BS CS 3rd Semester  
**IDs:** 2025(S)-CS-33, 2025(S)-CS-03, 2025(S)-CS-24, 2025(S)-CS-25, 2025(S)-CS-32  
**Course:** Software Engineering — IDEAL Labs

---

## About the Project

Auto Parts Hunt connects car owners with spare parts shopkeepers across Pakistan. Customers can browse parts, place orders, and track delivery. Shopkeepers manage their inventory and incoming orders. Admins oversee the entire platform.

**Tech Stack:**
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Supabase (PostgreSQL + REST API)
- Tunneling: ngrok
- Local Server: npx serve

---

## Folder Structure
```
Auto Parts/
├── app_state.js          ← Shared DB + Auth module (imported by every page)
├── Landing Page/
│   ├── landing_Page.HTML
│   ├── style.css
│   └── script.js
├── Login/
│   └── login.HTML        ← Handles both Login and Register
├── customer/
│   ├── customer_dashboard.HTML
│   ├── dashboard_style.css
│   └── dashboard_script.js
├── Shopkeeper/
│   ├── shopkeeper_dashboard.HTML
│   ├── shopkeeper_style.css
│   └── shopkeeper_script.js
├── admin/
│   ├── admin_dashboard.HTML
│   ├── admin2_style.css
│   └── admin2_script.js
├── track order/
│   ├── track_order.HTML
│   ├── track_style.css
│   └── track_script.js
└── contact/
    └── contact.html
```

---

## How to Run Locally

### Requirements
- [Node.js](https://nodejs.org) installed
- [ngrok](https://ngrok.com) account + authtoken configured

### Step 1 — Serve the files
```bash
npx serve "Auto Parts" -l 3000
```
App is now running at `http://localhost:3000`

### Step 2 — Open a public tunnel (new terminal)
```bash
ngrok http 3000
```
ngrok will print a public HTTPS URL like:
```
Forwarding: https://sandless-dan-guitarlike.ngrok-free.dev → http://localhost:3000
```

### Step 3 — Monitor requests
Open `http://127.0.0.1:4040` in your browser to see live HTTP logs.

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@autopartlogin | admin@auto |
| Customer | Register via the app | — |
| Shopkeeper | Register via the app | — |

> ⚠️ Passwords are stored as plain text. This is a prototype — not for production use.

---

## 🗄️ Database (Supabase)

Project URL: `https://vfvouexomhdwvmyleqgt.supabase.co`

**Tables:**
| Table | Purpose |
|-------|---------|
| `users` | All registered users (customers, shopkeepers, admin) |
| `shops` | Shopkeeper store profiles |
| `parts` | Auto part listings |
| `orders` | Customer orders |
| `reviews` | Post-delivery product reviews |

The admin account is auto-seeded on first load via `APP.init()` in `app_state.js`.

---

## 👥 Team

| Name | Student ID |
|------|-----------|
| Member 1 | 2025(S)-CS-33 |
| Member 2 | 2025(S)-CS-03 |
| Member 3 | 2025(S)-CS-24 |
| Member 4 | 2025(S)-CS-25 |
| Member 5 | 2025(S)-CS-32 |
