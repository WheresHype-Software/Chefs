-- Ao Lume: asking for the Chef title without a certificate
--
-- Many good cooks never went to a cooking school: years in a kitchen, or years teaching, are their
-- proof. Besides sending a certificate, a cook can now describe their experience in words, and a
-- person in the team decides. The text is private (the cook and the team only): it is never shown
-- on the public profile, which is why it does not live in chef_certifications (publicly readable).

create table public.chef_title_statements (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  body text not null check (char_length(body) between 20 and 1500),
  created_at timestamptz not null default now()
);

create index chef_title_statements_chef_idx on public.chef_title_statements (chef_id);

alter table public.chef_title_statements enable row level security;

create policy chef_title_statements_owner on public.chef_title_statements
  for all using (chef_id = public.my_chef_id()) with check (chef_id = public.my_chef_id());
create policy chef_title_statements_admin on public.chef_title_statements
  for all using (public.is_admin()) with check (public.is_admin());
