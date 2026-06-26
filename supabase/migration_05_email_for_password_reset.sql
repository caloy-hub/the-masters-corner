-- ============================================================
-- Migration 05: store email on profiles (needed so admins can
-- send password-reset links by email), and password-reset support.
-- Run this in the Supabase SQL editor AFTER migration_04.
-- ============================================================

alter table profiles add column email text;

-- Backfill existing profiles from auth.users
update profiles p set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Keep new sign-ups' email populated going forward
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'teacher', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- No new RLS policies needed — email is just another column on
-- `profiles`, already covered by the existing select policies
-- (admin sees all, same-team sees same-team, everyone sees self).
