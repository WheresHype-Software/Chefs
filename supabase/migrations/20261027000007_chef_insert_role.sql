-- Ao Lume: only chef (or admin) accounts may create a chef page.
-- Client accounts used to pass the insert policy because it only checked profile_id.
drop policy if exists chefs_owner_insert on public.chefs;
create policy chefs_owner_insert on public.chefs for insert
  with check (profile_id = auth.uid() and public.my_role() in ('chef', 'admin'));
