# The Master's Corner — RPMS-PPST & PMCF Performance Coaching App

A small-school (≤30 teachers) web app for teacher performance coaching and
monitoring, built around DepEd's **RPMS-PPST** classroom observation tool
and a **PMCF** (Performance Monitoring & Coaching Form) for ongoing coaching
conversations.

- **Frontend:** React + Vite, deployed to **Netlify**
- **Backend:** **Supabase** (Postgres + Auth + Storage)
- **Roles:** Admin, Master Teacher, Teacher
- **Rating scale:** Official DepEd 5-point scale — Outstanding (5), Very
  Satisfactory (4), Satisfactory (3), Unsatisfactory (2), Poor (1)
- Teachers can only see their own results once an admin/master teacher
  approves and releases them.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → Run.
   This creates all tables, the 7 PPST domains, a starter set of indicators,
   row-level security policies, and a private `evidence` storage bucket.
3. Go to **Project Settings → API** and copy your **Project URL** and
   **anon public key**.
4. The first real admin: sign up normally through the app (everyone starts
   as `teacher` by default), then in Supabase **Table Editor → profiles**,
   change that row's `role` to `admin`. Do the same to promote master
   teachers (`master_teacher`).
5. (Optional) Add the remaining ~26 PPST indicators in **Table Editor →
   ppst_indicators** to match your full official RPMS Tool — a starter set
   covering all 7 domains is already seeded so the app works immediately.

## 2. Run locally

```bash
npm install
cp .env.example .env
# edit .env with your Supabase URL + anon key
npm run dev
```

## 3. Deploy to Netlify

1. Push this folder to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
   Build command and publish directory are already set via `netlify.toml`
   (`npm run build` → `dist`).
3. In **Site settings → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. The SPA redirect rule in `netlify.toml` makes client-side routing
   work on refresh/deep links.

## How the workflow fits together

- **Master teacher** fills out an RPMS-PPST observation (`/rpms`) or a PMCF
  coaching form (`/pmcf`) for a teacher, rating each PPST indicator 1–5,
  then **Submits for approval**.
- **Admin** reviews submissions on `/approvals`, approves, and releases them
  to the teacher.
- **Teacher** can only see their own results on `/my-results` after that
  release happens — nothing is visible before approval.
- **Reports** (`/reports`) gives admins/master teachers a school-wide view
  across teachers and rating periods.
- **Users** (`/users`, admin-only) manages roles and active status.

## What you'll likely want to customize next

- Fill in the remaining PPST indicators for your specific career stage cycle
  (Proficient / Highly Proficient) per the current DepEd Memorandum.
- File-upload UI for evidence (the `evidence_files` table and storage bucket
  are ready; wire up a Supabase Storage upload widget in the RPMS/PMCF forms).
- Email notifications on submission/approval (Supabase Edge Functions + a
  transactional email provider).
