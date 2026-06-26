-- ============================================================
-- Migration 03: Teams (master teacher "circles") + approval
-- override fields (so the printed Approved By name/title doesn't
-- have to match whoever clicked Approve).
-- Run this in the Supabase SQL editor AFTER schema.sql and
-- migration_02_appointments.sql
-- ============================================================

-- 1. TEAMS ------------------------------------------------------
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table profiles add column team_id uuid references teams(id);

-- Helper: current user's team
create function public.current_team_id() returns uuid as $$
  select team_id from profiles where id = auth.uid();
$$ language sql security definer stable;

-- 2. APPROVAL OVERRIDE FIELDS ------------------------------------
alter table rpms_evaluations add column approving_official_name text;
alter table rpms_evaluations add column approving_official_title text default 'Principal';
alter table pmcf_records add column approving_official_name text;
alter table pmcf_records add column approving_official_title text default 'Principal';

-- 3. RLS: TEAMS table -------------------------------------------
alter table teams enable row level security;

create policy "teams_select_all" on teams for select using (true);
create policy "teams_admin_write" on teams for insert with check (current_app_role() = 'admin');
create policy "teams_admin_update" on teams for update using (current_app_role() = 'admin');
create policy "teams_admin_delete" on teams for delete using (current_app_role() = 'admin');

-- 4. RLS: re-scope master teachers to their own team --------------
-- (Admins keep full, school-wide access. Principals should use the
--  'admin' role, not 'master_teacher', for exactly that reason.)

-- PROFILES: replace the "everyone sees everyone" policy with
-- team-scoped visibility, while admins still see everyone.
drop policy "profiles_select_all" on profiles;
create policy "profiles_select_admin_all" on profiles for select
  using (current_app_role() = 'admin');
create policy "profiles_select_self" on profiles for select
  using (auth.uid() = id);
create policy "profiles_select_same_team" on profiles for select
  using (team_id is not null and team_id = current_team_id());

-- RPMS EVALUATIONS
drop policy "rpms_admin_mt_all" on rpms_evaluations;
create policy "rpms_admin_all" on rpms_evaluations for all
  using (current_app_role() = 'admin')
  with check (current_app_role() = 'admin');
create policy "rpms_mt_team_scoped" on rpms_evaluations for all
  using (
    current_app_role() = 'master_teacher'
    and exists (select 1 from profiles t where t.id = rpms_evaluations.teacher_id and t.team_id = current_team_id())
  )
  with check (
    current_app_role() = 'master_teacher'
    and exists (select 1 from profiles t where t.id = rpms_evaluations.teacher_id and t.team_id = current_team_id())
  );

-- RPMS SCORES
drop policy "scores_admin_mt_all" on rpms_scores;
create policy "scores_admin_all" on rpms_scores for all
  using (current_app_role() = 'admin')
  with check (current_app_role() = 'admin');
create policy "scores_mt_team_scoped" on rpms_scores for all
  using (
    current_app_role() = 'master_teacher'
    and exists (
      select 1 from rpms_evaluations e join profiles t on t.id = e.teacher_id
      where e.id = rpms_scores.evaluation_id and t.team_id = current_team_id()
    )
  )
  with check (
    current_app_role() = 'master_teacher'
    and exists (
      select 1 from rpms_evaluations e join profiles t on t.id = e.teacher_id
      where e.id = rpms_scores.evaluation_id and t.team_id = current_team_id()
    )
  );

-- PMCF RECORDS
drop policy "pmcf_admin_mt_all" on pmcf_records;
create policy "pmcf_admin_all" on pmcf_records for all
  using (current_app_role() = 'admin')
  with check (current_app_role() = 'admin');
create policy "pmcf_mt_team_scoped" on pmcf_records for all
  using (
    current_app_role() = 'master_teacher'
    and exists (select 1 from profiles t where t.id = pmcf_records.teacher_id and t.team_id = current_team_id())
  )
  with check (
    current_app_role() = 'master_teacher'
    and exists (select 1 from profiles t where t.id = pmcf_records.teacher_id and t.team_id = current_team_id())
  );

-- EVIDENCE FILES
drop policy "files_admin_mt_all" on evidence_files;
create policy "files_admin_all" on evidence_files for all
  using (current_app_role() = 'admin')
  with check (current_app_role() = 'admin');
create policy "files_mt_team_scoped" on evidence_files for all
  using (
    current_app_role() = 'master_teacher'
    and (
      exists (select 1 from rpms_evaluations e join profiles t on t.id = e.teacher_id where e.id = evidence_files.evaluation_id and t.team_id = current_team_id())
      or exists (select 1 from pmcf_records p join profiles t on t.id = p.teacher_id where p.id = evidence_files.pmcf_id and t.team_id = current_team_id())
    )
  )
  with check (
    current_app_role() = 'master_teacher'
    and (
      exists (select 1 from rpms_evaluations e join profiles t on t.id = e.teacher_id where e.id = evidence_files.evaluation_id and t.team_id = current_team_id())
      or exists (select 1 from pmcf_records p join profiles t on t.id = p.teacher_id where p.id = evidence_files.pmcf_id and t.team_id = current_team_id())
    )
  );

-- APPOINTMENTS (from migration 02) — team-scope master teachers too
drop policy "appt_admin_mt_all" on appointments;
create policy "appt_admin_all" on appointments for all
  using (current_app_role() = 'admin')
  with check (current_app_role() = 'admin');
create policy "appt_mt_team_scoped" on appointments for all
  using (
    current_app_role() = 'master_teacher'
    and exists (select 1 from profiles t where t.id = appointments.teacher_id and t.team_id = current_team_id())
  )
  with check (
    current_app_role() = 'master_teacher'
    and exists (select 1 from profiles t where t.id = appointments.teacher_id and t.team_id = current_team_id())
  );
