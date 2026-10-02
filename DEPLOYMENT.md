# Deployment Guide

## Prerequisites
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [Vercel](https://vercel.com) account (free tier is fine)

---

## Step 1 — Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name, strong password, and region closest to your users
3. Once the project is ready, go to **SQL Editor**
4. Copy the entire contents of `supabase/schema.sql` and paste it into the SQL Editor
5. Click **Run** — this creates all tables and seeds the default settings row
6. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (under "Project API keys", keep this secret) → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2 — Deploy to Vercel

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Vercel auto-detects Next.js — no build settings needed
4. Under **Environment Variables**, add these 4 variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `JWT_SECRET` | A random string (32+ chars) — generate with `openssl rand -base64 32` |
| `ADMIN_USERNAME` | Your chosen admin username (e.g. `admin`) |
| `ADMIN_PASSWORD` | Your chosen admin password (min 8 chars) |

5. Click **Deploy**

---

## Step 3 — Seed the Admin User (one-time)

After deployment, visit:
```
https://your-app.vercel.app/api/setup
```
You should see: `{"message":"Admin user created successfully."}`

This creates your admin account using the `ADMIN_USERNAME` and `ADMIN_PASSWORD` env vars.
It is safe to call again — it skips if the admin already exists.

---

## Step 4 — First Login

1. Go to `https://your-app.vercel.app/login`
2. Sign in with your admin credentials
3. You'll land on the Admin Dashboard

**Quick start workflow:**
1. **Sections** — Add your class sections (e.g. 3A, 3B, 3C)
2. **Exams** — Create an exam, add questions manually or import via CSV
3. **Sections** — Assign the exam to each section using the dropdown
4. **Users** — Add examiners and assign them to sections
5. **Settings** — Update the landing page title and description if needed
6. Share the site URL with students — they only need the homepage

---

## Local Development

```bash
# 1. Fill in .env.local with your Supabase + JWT values
# 2. Run the dev server
npm run dev
# 3. Seed admin (once):
# Visit http://localhost:3000/api/setup
```

---

## CSV Import Format

Download the template from the Exam Editor page or find it at:
`public/templates/exam-questions-template.csv`

See `public/templates/CSV-FORMAT-GUIDE.md` for full column documentation.

---

## Route Map

| Route | Access | Description |
|---|---|---|
| `/` | Public | Student landing page |
| `/exam` | Public | Exam-taking page |
| `/login` | Public | Staff login |
| `/admin` | Admin only | Dashboard |
| `/admin/sections` | Admin only | Manage sections + assignments |
| `/admin/exams` | Admin only | Manage exams |
| `/admin/exams/[id]` | Admin only | Question editor + CSV import |
| `/admin/results` | Admin only | All results |
| `/admin/users` | Admin only | Manage examiners |
| `/admin/settings` | Admin only | Site title + description |
| `/examiner` | Examiner + Admin | Results for assigned sections |
| `/api/setup` | Public (one-time) | Seeds admin user |
