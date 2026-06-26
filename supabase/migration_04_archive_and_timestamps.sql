-- ============================================================
-- Migration 04: Archive + submitted-at timestamp for reports
-- Run this in the Supabase SQL editor AFTER migration_03.
-- ============================================================

alter table rpms_evaluations add column archived boolean not null default false;
alter table rpms_evaluations add column submitted_at timestamptz;

alter table pmcf_records add column archived boolean not null default false;
alter table pmcf_records add column submitted_at timestamptz;

-- Backfill submitted_at for existing rows that are already past draft,
-- using created_at as the best available approximation.
update rpms_evaluations set submitted_at = created_at where status <> 'draft' and submitted_at is null;
update pmcf_records set submitted_at = created_at where status <> 'draft' and submitted_at is null;

-- No new RLS policies needed — delete/archive use the existing
-- "for all" policies admins and team-scoped master teachers already have
-- on rpms_evaluations and pmcf_records.
