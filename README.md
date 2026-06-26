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
3. Then paste the contents of `supabase/migration_02_appointments.sql` → Run.
   This adds the conference/observation scheduling table.
4. Then paste the contents of `supabase/migration_03_teams_and_overrides.sql` → Run.
   This adds Teams ("circles") and the approving-official override fields.
5. Then paste the contents of `supabase/migration_04_archive_and_timestamps.sql` → Run.
   This adds archiving and submitted-at timestamps to reports.
6. Then paste the contents of `supabase/migration_05_email_for_password_reset.sql` → Run.
   This stores each user's email on their profile, needed for password resets.
7. In **Authentication → URL Configuration**, add your deployed URL's
   `/reset-password` path to **Redirect URLs** (e.g.
   `https://your-site.netlify.app/reset-password`) — otherwise the
   password-reset email link won't be allowed to redirect back into the app.
4. Go to **Project Settings → API** and copy your **Project URL** and
   **anon public key**.
5. The first real admin: sign up normally through the app (everyone starts
   as `teacher` by default), then in Supabase **Table Editor → profiles**,
   change that row's `role` to `admin`. Do the same to promote master
   teachers (`master_teacher`).
6. (Optional) Add the remaining ~26 PPST indicators in **Table Editor →
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
- **Manage Indicators** (`/indicators`, admin-only) — add, edit, or delete
  PPST domains and indicators directly in the app. The RPMS-PPST form reads
  this table live, so changes show up immediately with no redeploy. Kept
  admin-only since the indicator list is shared school-wide, not per-team.
- **My Account** (`/account`, all roles) — anyone can change their own
  password here at any time, no admin involved.
- **Password reset (admin)** — on the Manage Users page, admins get a
  **Reset password** button next to each person. It emails that person a
  secure reset link (via Supabase's built-in reset flow) — admins never see
  or set the actual password directly, which keeps things secure without
  needing a backend server. The "Forgot password?" link on the login screen
  does the same thing for anyone who can't log in themselves.
- **Reports** now also shows a **Submitted** timestamp for every record, and
  lets you **Archive** (hide from the active view without deleting) or
  **Delete** (permanently remove) any RPMS evaluation or PMCF record. An
  **Active / Archived** toggle switches between the two views.
- **Schedule** (`/schedule`) lets admins/master teachers set up classroom
  observations and PMCF coaching conferences, with a date, time, duration,
  and location. Teachers can also request a slot themselves — it starts as
  *proposed* until an admin/master teacher confirms it. Either side can
  cancel a still-pending request; staff can mark a confirmed appointment
  *completed* once it happens.
- **Print** — once an RPMS-PPST evaluation or PMCF coaching record is
  approved (and, for RPMS, released), a **Print** button appears next to it
  in My Results (teacher) and Reports (admin/master teacher). It opens a
  clean, signature-ready printable version in a new tab — domain-by-domain
  ratings and evidence for RPMS, or the full coaching plan for PMCF — with
  blank signature lines for Teacher / Rated by / Approved by. Use your
  browser's print dialog (Ctrl/Cmd+P) or the on-page "Print this result"
  button to save as PDF or send to a printer.
- **Users** (`/users`, admin-only) manages roles, active status, and **Teams**
  — create a team per master teacher (e.g. "Team Mabini") and assign that
  master teacher plus their teachers to it. A master teacher then only sees
  and approves work for their own team; admins still see and can approve
  everything, across every team. (This is also why a principal should
  generally be set up as `admin` rather than `master_teacher` — they need the
  school-wide view.)
- **Approving official override** — on the Approvals page, master teachers
  set a "Full name" and "Title" (e.g. "Lyndon M. Dumael" / "Principal") that
  prints as the Approved By signature line, independent of who is actually
  logged in approving it. It's remembered on that device for next time, and
  can be changed any time before clicking Approve.

## What you'll likely want to customize next

- Fill in the remaining PPST indicators for your specific career stage cycle
  (Proficient / Highly Proficient) per the current DepEd Memorandum.
- File-upload UI for evidence (the `evidence_files` table and storage bucket
  are ready; wire up a Supabase Storage upload widget in the RPMS/PMCF forms).
- Email notifications on submission/approval (Supabase Edge Functions + a
  transactional email provider).
