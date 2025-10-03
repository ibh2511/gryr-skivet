# GRYR® SKIVET – Mini Campaign Site 🍞🧀

A tiny, privacy-aware campaign site that helps people **call**, **email**, **download a QR lock screen**, and **share on Facebook** to bring *GRYR® SKIVET* back to stores.  
Built as a **static site on GitHub Pages** with analytics handled by **Supabase Edge Functions** (server-side, secure). ⚡

---

## ✨ What’s inside

- **`index.html`** – Public landing page
  - CTA buttons: **Phone**, **Email**, **Email text link**, **QR download**
  - **Facebook share** link (subtle; sits on a full-bleed SVG wave)
  - **Responsive** layout (mobile-first, equal button widths)
  - **Email button pulse** effect in `#F4D31F`
  - **Client-side rate limiting** to avoid spammy logging
  - No direct database keys in the client
- **`admin.html`** – Admin dashboard
  - Live counts: *unique visitors*, *phone*, *email button*, *email link*, *downloads*, *Facebook shares*
  - **Engagement metric**: unique users who clicked ≥1 link vs unique visitors
  - **CSV export** of events
  - **Reset (truncate)** with confirmation and graceful “no data” message
  - **Responsive table** (keeps header visible on mobile; no horizontal scroll)
  - Admin key is **not embedded** in code; requested via URL `?key=` or a prompt (stored only in `sessionStorage`)
- **Supabase Edge Functions** (`/supabase/functions`)
  - **`log`** – Receives event logs from `index.html`. Ensures visitor exists, then inserts an event.
  - **`admin`** – Protected with `x-admin-key`. Returns counts, exports data, and resets tables.
  - Both functions:
    - Use **Service Role key** (server-side only; never exposed)
    - Have **CORS** enabled for GitHub Pages origin
    - **JWT verification disabled** (`verify_jwt=false`), so the client doesn’t need a Bearer token
- **GitHub Actions** (CI/CD)
  - Deploys Edge Functions via Supabase CLI
  - **Injects** your Supabase project ref into HTML (`__PROJECT_REF__`)
  - Publishes the site to **GitHub Pages**

---

## 🧱 Data model (Postgres / Supabase)

- `visitors (id uuid primary key, first_seen timestamptz default now())`
- `events (id bigint identity primary key, visitor_id uuid references visitors(id) on delete cascade, event_type text not null, created_at timestamptz default now())`
- Check constraint on `events.event_type`:
  - `visit`, `phone`, `email`, `email_link`, `download`, `fb_share`
- **RLS enabled** on both tables (Edge Functions bypass via Service Role)

---

## 🔐 Security model (plain English)

- The public site never holds Service Role or admin secrets.  
- **All writes/reads** go through **Edge Functions** hosted by Supabase.
- `log` function accepts *only* `visitor_id` + `event_type`, creates visitor if missing, then inserts the event.
- `admin` function requires **`x-admin-key`** (compared against `ADMIN_KEY` in function secrets) for counts/reset/export.
- **CORS** only allows your GitHub Pages origin.
- **JWT verification disabled** on functions → no Authorization header needed from the browser.

---

## 🛠️ Setup (quick)

### 1) Supabase (Studio)
- Create tables + constraint (run once in **SQL Editor**).
- **Function Secrets** (`Project Settings → Functions → Secrets`):
  - `SB_URL` = `https://<project-ref>.supabase.co`
  - `SB_SERVICE_ROLE_KEY` = *Service Role key* (from **Project Settings → API**)
  - `ADMIN_KEY` = your private admin password
- Ensure **Edge Functions** `log` and `admin` have `verify_jwt=false` (via `config.toml` or deploy flag).

### 2) GitHub (repo → Settings → Secrets and variables → Actions)
- `SUPABASE_PROJECT_REF` = your ref (e.g. `hxojgjbdepemuyztjroz`)
- `SUPABASE_ACCESS_TOKEN` = your Supabase **Access Token** (from Supabase account)

> Not needed in this setup: `SUPABASE_ANON`, `SUPABASE_URL`, `EXPECTED_ADMIN_KEY`.

### 3) GitHub Actions workflow
- `.github/workflows/deploy.yml`:
  - Injects `__PROJECT_REF__` in all HTML files
  - Deploys `log` + `admin` with `--no-verify-jwt`
  - Publishes to **Pages**

### 4) Usage
- Public site (Pages):  
  `https://<username>.github.io/<repo>/`
- Admin dashboard:  
  `https://<username>.github.io/<repo>/admin.html?key=<YOUR_ADMIN_KEY>`

---

## 📈 Tracked events

- `visit` – first time a browser sees the page (1x per device via `localStorage`)
- `phone` – phone button clicked
- `email` – email button clicked
- `email_link` – inline email link clicked (beneath the button)
- `download` – QR image download initiated
- `fb_share` – Facebook share window opened successfully

> Client includes a small **rate limiter** (~1.5s per event type) to avoid accidental spam.

---

## 🧭 Styling & UX

- **Nunito Sans** typography, crisp buttons, consistent widths  
- **Full-bleed SVG wave** in the footer (frequency doesn’t squash on mobile)  
- Facebook share link sits **on the wave**  
- **Status bubble** in the bottom-right shows connection/logging status  
- Admin table is **mobile-friendly** and keeps a **darker header** visible

---

## 🧪 Troubleshooting

- **401 “Missing authorization header”**  
  → Your function is still verifying JWT. Ensure `verify_jwt=false` via `config.toml` or `--no-verify-jwt`, redeploy.

- **CORS error**  
  → Make sure functions return `Access-Control-Allow-Origin: https://<username>.github.io` (exact origin, not the repo path).  
  → Confirm your browser is calling the **project ref URL**:  
    `https://<project-ref>.functions.supabase.co/<fn>`.

- **`__PROJECT_REF__` visible in page source**  
  → GitHub Actions didn’t inject it. Check the “Inject placeholders” / “Verify replacements” steps in Actions logs.  
  → Ensure the placeholder in HTML is exactly `__PROJECT_REF__`.

---

## 📜 License

Use freely for your campaign. If you adapt it, a shout-out is appreciated! 🙌

---

## 🙋 Why this stack?

- **GitHub Pages** for zero-cost hosting and simple deploys  
- **Supabase Edge Functions** to keep secrets off the client and centralize logic  
- **Minimal JS**, no frameworks – easy to fork and tweak  
- Works great on **mobile** (where most actions—call/email/share—happen) 📱
