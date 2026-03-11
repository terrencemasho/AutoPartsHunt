# Deployment Guide — Auto Parts Hunt

## Live URL

> **https://auto-parts-hunt.vercel.app**

The app is deployed on **Vercel** and connected to **GitHub** for automatic redeployment.
No local machine needs to be running for the site to stay live.

---

## Deployment Stack

| Layer | Service | Details |
|-------|---------|---------|
| Frontend Hosting | Vercel (Free) | Serves all static HTML/CSS/JS. Permanent HTTPS URL. |
| Source Control | GitHub | github.com/terrencemasho/AutoPartsHunt |
| Routing Config | vercel.json + index.html | Maps root path to landing page. All sub-paths resolve correctly. |
| Database & API | Supabase (Free) | PostgreSQL + auto-generated REST API. Always live. |
| SSL / HTTPS | Vercel (auto) | TLS certificate auto-provisioned. No manual setup needed. |

---

## How Deployment Works

Vercel is connected directly to the GitHub repository. Every time a commit is pushed to the `main` branch, Vercel automatically redeploys the site within ~30 seconds. No manual steps required after the initial setup.

---

## Initial Setup Steps

### 1. Push code to GitHub
Ensure the following files exist at the repo root:
```
AutoPartsHunt/     ← all project files
index.html         ← redirects root to landing page
vercel.json        ← routing configuration
README.md
DEPLOYMENT.md
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Click **Import** next to `terrencemasho/AutoPartsHunt`
3. Set **Framework Preset** to `Other`
4. Leave Build Command, Output Directory, and Install Command **blank**
5. Click **Deploy**

### 3. Verify deployment
Visit `https://auto-parts-hunt.vercel.app` and confirm:
- Landing page loads
- Login and Register work
- Admin login: `admin@autopartlogin` / `admin@auto`
- Shopkeeper and Customer dashboards load after registration

---

## vercel.json
```json
{
  "rewrites": [
    { "source": "/", "destination": "/AutoPartsHunt/Landing/landing_Page.HTML" },
    { "source": "/(.*)", "destination": "/AutoPartsHunt/$1" }
  ]
}
```

---

## index.html (repo root)
```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=/AutoPartsHunt/Landing/landing_Page.HTML">
</head>
<body>
  <script>window.location.href = '/AutoPartsHunt/Landing/landing_Page.HTML';</script>
</body>
</html>
```

---

## Future Updates

Any `git push` to the `main` branch triggers automatic redeployment. To update the live site:
```bash
git add -A
git commit -m "your update message"
git push
```

Vercel picks up the change and redeploys within 30 seconds.

---

## Known Limitations

| Limitation | Details |
|-----------|---------|
| Plain-text passwords | Passwords stored unhashed — prototype only, not for production. |
| No image upload | Part images use external URLs. Supabase Storage not yet integrated. |
| Cart not persisted | Cart lives in memory — lost on page refresh. |
| Supabase cold start | First request after inactivity ~1s. Subsequent requests 180–400ms. |
