-- ============================================================
-- RPMS-PPST + PMCF schema for Supabase
-- Run this in the Supabase SQL editor (or `supabase db push`)
-- ============================================================

-- 1. ROLES & PROFILES -----------------------------------------------------
create type user_role as enum ('admin', 'master_teacher', 'teacher');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'teacher',
  school text,
  position text,            -- e.g. "Teacher I", "Master Teacher II"
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'teacher');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. PPST REFERENCE DATA (7 Domains) --------------------------------------
create table ppst_domains (
  domain_no int primary key,
  title text not null
);

insert into ppst_domains (domain_no, title) values
  (1, 'Content Knowledge and Pedagogy'),
  (2, 'Learning Environment'),
  (3, 'Diversity of Learners'),
  (4, 'Curriculum and Planning'),
  (5, 'Assessment and Reporting'),
  (6, 'Community Linkages and Professional Engagement'),
  (7, 'Personal Growth and Professional Development');

create table ppst_indicators (
  id uuid primary key default gen_random_uuid(),
  domain_no int references ppst_domains(domain_no) not null,
  objective_code text not null,     -- e.g. "1.1.1"
  description text not null,
  career_stage text default 'Proficient'
);

-- Starter seed (expand freely in Supabase Table Editor to match the full
-- 37-indicator official RPMS Tool for your career stage / cycle)
insert into ppst_indicators (domain_no, objective_code, description) values
  (1, '1.1.1', 'Applied knowledge of content within and across curriculum teaching areas'),
  (1, '1.4.1', 'Used a range of teaching strategies that enhance learner achievement in literacy and numeracy skills'),
  (2, '2.3.1', 'Managed classroom structure to engage learners, individually or in groups, in meaningful exploration'),
  (2, '2.6.1', 'Used strategies that build a safe and secure learning environment'),
  (3, '3.1.1', 'Used differentiated, developmentally appropriate learning experiences to address learners'' gender, needs, strengths, interests and experiences'),
  (4, '4.1.1', 'Planned and managed teaching and learning processes appropriate to specific subjects and grade/year level'),
  (4, '4.5.1', 'Selected, developed, organized and used appropriate teaching and learning resources, including ICT'),
  (5, '5.1.1', 'Designed, selected, organized and used diagnostic, formative and summative assessment strategies'),
  (5, '5.4.1', 'Provided timely, accurate and constructive feedback to improve learner performance'),
  (6, '6.2.1', 'Built relationships with parents/guardians and the wider school community to facilitate involvement'),
  (7, '7.1.1', 'Reflected on the extent of attainment of professional development goals based on the PPST');

-- 3. RPMS EVALUATIONS (classroom observation / IPCRF rating) -------------
create type eval_status as enum ('draft', 'submitted', 'approved', 'released');

create table rpms_evaluations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) not null,
  evaluator_id uuid references profiles(id) not null,   -- master teacher / admin
  school_year text not null,           -- e.g. "2026-2027"
  rating_period text not null,         -- e.g. "Mid-Year", "Year-End"
  status eval_status not null default 'draft',
  overall_rating numeric(3,2),         -- computed average, 1.00 - 5.00
  overall_descriptor text,             -- Outstanding / Very Satisfactory / Satisfactory / Unsatisfactory / Poor
  remarks text,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  released_to_teacher boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rpms_scores (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid references rpms_evaluations(id) on delete cascade not null,
  indicator_id uuid references ppst_indicators(id) not null,
  rating int not null check (rating between 1 and 5),
  evidence text
);

-- Official DepEd 5-point descriptor reference (for UI display only)
create table rating_descriptors (
  rating int primary key,
  descriptor text not null
);
insert into rating_descriptors (rating, descriptor) values
  (5, 'Outstanding'),
  (4, 'Very Satisfactory'),
  (3, 'Satisfactory'),
  (2, 'Unsatisfactory'),
  (1, 'Poor');

-- 4. PMCF — Performance Monitoring & Coaching Form ------------------------
create type pmcf_status as enum ('draft', 'submitted', 'approved');

create table pmcf_records (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) not null,
  master_teacher_id uuid references profiles(id) not null,
  related_evaluation_id uuid references rpms_evaluations(id),
  domain_no int references ppst_domains(domain_no),
  indicator_text text not null,        -- which PPST indicator is being coached
  observation text,                    -- what was observed / evidence
  strengths text,
  areas_for_improvement text,
  coaching_action_plan text,
  agreed_timeline date,
  follow_up_notes text,
  status pmcf_status not null default 'draft',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- 5. FILE UPLOADS (evidence attachments) ----------------------------------
create table evidence_files (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid references rpms_evaluations(id) on delete cascade,
  pmcf_id uuid references pmcf_records(id) on delete cascade,
  uploaded_by uuid references profiles(id) not null,
  storage_path text not null,    -- path inside the 'evidence' storage bucket
  file_name text not null,
  created_at timestamptz not null default now()
);

-- Create the storage bucket for evidence uploads (run once)
insert into storage.buckets (id, name, public) values ('evidence', 'evidence', false)
on conflict (id) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table rpms_evaluations enable row level security;
alter table rpms_scores enable row level security;
alter table pmcf_records enable row level security;
alter table evidence_files enable row level security;

-- Helper: current user's role
create function public.current_app_role() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- PROFILES: everyone can read all profiles (needed for dropdowns/reports);
-- only admins can edit roles; users can edit their own non-role fields.
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_self" on profiles for update
  using (auth.uid() = id or current_app_role() = 'admin');
create policy "profiles_insert_admin" on profiles for insert
  with check (current_app_role() = 'admin' or auth.uid() = id);

-- RPMS EVALUATIONS
-- Admins & master teachers: full access.
-- Teachers: select only their OWN evaluation, and only once approved/released.
create policy "rpms_admin_mt_all" on rpms_evaluations for all
  using (current_app_role() in ('admin', 'master_teacher'))
  with check (current_app_role() in ('admin', 'master_teacher'));

create policy "rpms_teacher_view_own_released" on rpms_evaluations for select
  using (
    teacher_id = auth.uid()
    and status in ('approved', 'released')
    and released_to_teacher = true
  );

-- RPMS SCORES follow the same visibility as their parent evaluation
create policy "scores_admin_mt_all" on rpms_scores for all
  using (current_app_role() in ('admin', 'master_teacher'))
  with check (current_app_role() in ('admin', 'master_teacher'));

create policy "scores_teacher_view_own_released" on rpms_scores for select
  using (
    exists (
      select 1 from rpms_evaluations e
      where e.id = rpms_scores.evaluation_id
        and e.teacher_id = auth.uid()
        and e.released_to_teacher = true
    )
  );

-- PMCF RECORDS: same pattern as evaluations
create policy "pmcf_admin_mt_all" on pmcf_records for all
  using (current_app_role() in ('admin', 'master_teacher'))
  with check (current_app_role() in ('admin', 'master_teacher'));

create policy "pmcf_teacher_view_own_approved" on pmcf_records for select
  using (teacher_id = auth.uid() and status = 'approved');

-- EVIDENCE FILES: admins/master teachers manage; teachers can read files
-- attached to their own released records.
create policy "files_admin_mt_all" on evidence_files for all
  using (current_app_role() in ('admin', 'master_teacher'))
  with check (current_app_role() in ('admin', 'master_teacher'));

create policy "files_teacher_view_own" on evidence_files for select
  using (
    exists (
      select 1 from rpms_evaluations e
      where e.id = evidence_files.evaluation_id
        and e.teacher_id = auth.uid()
        and e.released_to_teacher = true
    )
    or exists (
      select 1 from pmcf_records p
      where p.id = evidence_files.pmcf_id
        and p.teacher_id = auth.uid()
        and p.status = 'approved'
    )
  );

-- Reference tables are world-readable, admin-writable
alter table ppst_domains enable row level security;
alter table ppst_indicators enable row level security;
alter table rating_descriptors enable row level security;
create policy "ref_select_all" on ppst_domains for select using (true);
create policy "ref_select_all_2" on ppst_indicators for select using (true);
create policy "ref_select_all_3" on rating_descriptors for select using (true);
create policy "ref_admin_write" on ppst_indicators for insert with check (current_app_role() = 'admin');
create policy "ref_admin_update" on ppst_indicators for update using (current_app_role() = 'admin');
