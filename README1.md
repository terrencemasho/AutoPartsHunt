# 🔧 Auto Parts Hunt

> A web-based marketplace for buying and selling automobile spare parts across Pakistan.

**Team:** The Recursives — BS CS 3rd Semester
**IDs:** 2025(S)-CS-33, 2025(S)-CS-03, 2025(S)-CS-24, 2025(S)-CS-25, 2025(S)-CS-32
**Course:** Software Engineering — IDEAL Labs

---

## 🌐 Live Demo

> **https://auto-parts-hunt.vercel.app**

Hosted on Vercel — permanent URL, live 24/7, no local machine required.

---

## About the Project

Auto Parts Hunt connects car owners with spare parts shopkeepers across Pakistan. Customers can browse parts, place orders, and track delivery. Shopkeepers manage their inventory and incoming orders. Admins oversee the entire platform.

**Tech Stack:**
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Supabase (PostgreSQL + REST API)
- Hosting: Vercel (static deployment)
- Source Control: GitHub

---

## Folder Structure
```
AutoPartsHunt/
├── app_state.js          ← Shared DB + Auth module (imported by every page)
├── Landing/
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
├── track/
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

### Step 1 — Clone the repo
```bash
git clone https://github.com/terrencemasho/AutoPartsHunt.git
cd AutoPartsHunt
```

### Step 2 — Serve the files
```bash
npx serve AutoPartsHunt -l 3000
```
App is now running at `http://localhost:3000`

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
