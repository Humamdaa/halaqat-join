# Halaqat Join

Small React + Vite site used only for Halaqat invitation registration.

## What it does

1. Reads `?token=...` from the URL.
2. Calls Supabase `resolve_join_link`.
3. Shows the mosque name and fixed role (student/teacher).
4. Creates the Supabase Auth account.
5. Calls `submit_join_request`.
6. The request appears as pending in the Flutter supervisor app.

## 1. Supabase migration

Run this file in Supabase SQL Editor:

```text
supabase/004_join_web_registration.sql
```

Make sure these existing functions also exist:

- `resolve_join_link(text)`
- secure `create_join_link(uuid, text)`

## 2. Supabase Auth

Because Halaqat currently uses synthetic addresses such as:

```text
username@halaqat.local
```

disable **Confirm Email** in Supabase Authentication -> Providers -> Email.

## 3. Local environment

Copy `.env.example` to `.env.local` and fill:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Never use a service-role or secret key in this site.

## 4. Run locally

```bash
npm install
npm run dev
```

Open with a real token:

```text
http://localhost:5173/?token=YOUR_TOKEN
```

## 5. GitHub repository

Create a public repository named exactly:

```text
halaqat-join
```

If you choose another name, update `base` in `vite.config.js`.

Then:

```bash
git init
git add .
git commit -m "Create Halaqat join website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/halaqat-join.git
git push -u origin main
```

## 6. GitHub Actions secrets

Repository -> Settings -> Secrets and variables -> Actions.

Create:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

## 7. Enable GitHub Pages

Repository -> Settings -> Pages -> Source: **GitHub Actions**.

The included workflow deploys after every push to `main`.

## 8. Final URL

```text
https://YOUR_USERNAME.github.io/halaqat-join/
```

Invite URL:

```text
https://YOUR_USERNAME.github.io/halaqat-join/?token=TOKEN
```
