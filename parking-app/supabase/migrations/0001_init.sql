-- OCR-Based Motor Vehicle Parking Management System
-- Initial schema, RLS policies, and storage bucket.
-- Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('admin', 'guard');
exception when duplicate_object then null; end $$;

do $$ begin
  create type owner_type as enum ('Student', 'Faculty', 'Staff', 'Visitor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vehicle_status as enum ('Inside', 'Outside', 'Parked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type parking_status as enum ('Parked', 'Exited');
exception when duplicate_object then null; end $$;

-- ── Users (Guards & Admins) ─────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'guard',
  contact_no text,
  created_at timestamptz not null default now()
);

-- ── Vehicle Owners (Students/Staff) ─────────────────────
create table if not exists public.vehicle_owners (
  owner_id uuid primary key default gen_random_uuid(),
  fname text not null,
  mname text,
  lname text not null,
  contact_no text,
  type owner_type not null,
  created_at timestamptz not null default now()
);

-- ── Vehicles ─────────────────────────────────────────────
create table if not exists public.vehicles (
  vehicle_id uuid primary key default gen_random_uuid(),
  plate_number text not null unique,
  owner_id uuid not null references public.vehicle_owners(owner_id) on delete cascade,
  vehicle_type text not null,
  status vehicle_status not null default 'Outside',
  created_at timestamptz not null default now()
);
create index if not exists idx_vehicles_plate on public.vehicles(plate_number);

-- ── Parking Records ──────────────────────────────────────
create table if not exists public.parking_records (
  record_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  vehicle_id uuid not null references public.vehicles(vehicle_id),
  time_in timestamptz not null default now(),
  time_out timestamptz,
  status parking_status not null default 'Parked',
  image_path text
);
create index if not exists idx_records_vehicle on public.parking_records(vehicle_id);
create index if not exists idx_records_status on public.parking_records(status);

-- ── Logs (audit trail) ───────────────────────────────────
create table if not exists public.logs (
  log_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  action text not null,
  description text,
  timestamp timestamptz not null default now()
);

-- ── Storage bucket for plate photos ─────────────────────
insert into storage.buckets (id, name, public)
values ('plate-images', 'plate-images', false)
on conflict (id) do nothing;

-- ── RLS ──────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.vehicle_owners enable row level security;
alter table public.vehicles enable row level security;
alter table public.parking_records enable row level security;
alter table public.logs enable row level security;

create or replace function public.is_admin() returns boolean as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$ language sql security definer stable;

drop policy if exists "users_select_own_or_admin" on public.users;
create policy "users_select_own_or_admin" on public.users
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "users_admin_write" on public.users;
create policy "users_admin_write" on public.users
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "owners_read_all" on public.vehicle_owners;
create policy "owners_read_all" on public.vehicle_owners for select using (auth.uid() is not null);
drop policy if exists "owners_admin_write" on public.vehicle_owners;
create policy "owners_admin_write" on public.vehicle_owners for insert with check (public.is_admin());
drop policy if exists "owners_admin_update" on public.vehicle_owners;
create policy "owners_admin_update" on public.vehicle_owners for update using (public.is_admin());
drop policy if exists "owners_admin_delete" on public.vehicle_owners;
create policy "owners_admin_delete" on public.vehicle_owners for delete using (public.is_admin());

drop policy if exists "vehicles_read_all" on public.vehicles;
create policy "vehicles_read_all" on public.vehicles for select using (auth.uid() is not null);
drop policy if exists "vehicles_admin_write" on public.vehicles;
create policy "vehicles_admin_write" on public.vehicles for insert with check (public.is_admin());
drop policy if exists "vehicles_admin_update" on public.vehicles;
create policy "vehicles_admin_update" on public.vehicles for update using (public.is_admin());
drop policy if exists "vehicles_admin_delete" on public.vehicles;
create policy "vehicles_admin_delete" on public.vehicles for delete using (public.is_admin());

drop policy if exists "records_read_all" on public.parking_records;
create policy "records_read_all" on public.parking_records for select using (auth.uid() is not null);
drop policy if exists "records_insert_own" on public.parking_records;
create policy "records_insert_own" on public.parking_records for insert with check (auth.uid() is not null);
drop policy if exists "records_update_own_or_admin" on public.parking_records;
create policy "records_update_own_or_admin" on public.parking_records for update
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "logs_insert_own" on public.logs;
create policy "logs_insert_own" on public.logs for insert with check (user_id = auth.uid());
drop policy if exists "logs_admin_read" on public.logs;
create policy "logs_admin_read" on public.logs for select using (public.is_admin());

-- ── Storage policies for plate-images bucket ────────────
drop policy if exists "plate_images_authenticated_read" on storage.objects;
create policy "plate_images_authenticated_read" on storage.objects
  for select using (bucket_id = 'plate-images' and auth.uid() is not null);

drop policy if exists "plate_images_authenticated_write" on storage.objects;
create policy "plate_images_authenticated_write" on storage.objects
  for insert with check (bucket_id = 'plate-images' and auth.uid() is not null);

-- ── Enable Realtime on live-changing tables ─────────────
alter publication supabase_realtime add table public.parking_records;
alter publication supabase_realtime add table public.vehicles;
alter publication supabase_realtime add table public.vehicle_owners;
alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.logs;

-- ── Sample Admin User (For local testing only) ──────────
-- Email: admin@test.com
-- Password: password123
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated', 'admin@test.com', crypt('password123', gen_salt('bf')), now(), 
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  );
  
  -- Insert into public.users
  INSERT INTO public.users (id, full_name, role, contact_no)
  VALUES (admin_id, 'System Administrator', 'admin', '1234567890');
END $$;

