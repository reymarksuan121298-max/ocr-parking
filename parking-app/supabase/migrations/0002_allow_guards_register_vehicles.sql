-- Allow authenticated users (guards and admins) to register vehicle owners and vehicles

drop policy if exists "owners_admin_write" on public.vehicle_owners;
create policy "owners_authenticated_insert" on public.vehicle_owners 
  for insert with check (auth.uid() is not null);

drop policy if exists "vehicles_admin_write" on public.vehicles;
create policy "vehicles_authenticated_insert" on public.vehicles 
  for insert with check (auth.uid() is not null);
