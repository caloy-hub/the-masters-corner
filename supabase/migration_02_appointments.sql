-- ============================================================
-- Migration 02: Appointments (conference & classroom observation
-- scheduling for RPMS-PPST and PMCF)
-- Run this in the Supabase SQL editor AFTER schema.sql
-- ============================================================

create type appointment_purpose as enum (
  'classroom_observation',   -- RPMS-PPST classroom observation
  'pmcf_conference',         -- PMCF coaching conference
  'other'
);

create type appointment_status as enum ('proposed', 'confirmed', 'completed', 'cancelled');

create table appointments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) not null,
  observer_id uuid references profiles(id) not null,   -- master teacher / admin conducting it
  scheduled_by uuid references profiles(id) not null,  -- who created the request
  purpose appointment_purpose not null default 'classroom_observation',
  title text,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 45,
  location text,
  notes text,
  status appointment_status not null default 'proposed',
  created_at timestamptz not null default now()
);

alter table appointments enable row level security;

-- Admins & master teachers: full access (create, confirm, reschedule, cancel, complete)
create policy "appt_admin_mt_all" on appointments for all
  using (current_app_role() in ('admin', 'master_teacher'))
  with check (current_app_role() in ('admin', 'master_teacher'));

-- Teachers can see their own appointments
create policy "appt_teacher_select_own" on appointments for select
  using (teacher_id = auth.uid());

-- Teachers can request an appointment for themselves (starts as 'proposed')
create policy "appt_teacher_insert_own" on appointments for insert
  with check (teacher_id = auth.uid() and scheduled_by = auth.uid() and status = 'proposed');

-- Teachers can cancel their own still-pending request (not yet confirmed)
create policy "appt_teacher_cancel_own" on appointments for update
  using (teacher_id = auth.uid() and status = 'proposed')
  with check (teacher_id = auth.uid() and status = 'cancelled');
