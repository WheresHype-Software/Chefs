-- Ao Lume: payment settings
--
-- One row, id = 1. Everything that decides how much money moves lives here and not in code, so a
-- commission change is an admin decision with an audit line, not a deploy. Readable by anyone (the
-- chef is told what the commission is before signing); writable by admins only.

create table public.platform_settings (
  id int primary key default 1 check (id = 1),
  -- Payments also need PAYMENTS_ENABLED in the environment; both have to be on.
  payments_enabled boolean not null default false,
  -- Commission is a percentage of the whole booking value, taken out of the signal.
  commission_percent numeric(5, 2) not null default 12.00 check (commission_percent between 0 and 100),
  commission_min numeric(10, 2) not null default 3.00 check (commission_min >= 0),
  -- A chef's signal must leave room for the commission: deposit_percent >= commission + this.
  deposit_margin_percent numeric(5, 2) not null default 5.00 check (deposit_margin_percent between 0 and 100),
  -- How long the client has to pay the signal after the chef accepts.
  deposit_due_hours int not null default 48 check (deposit_due_hours between 1 and 720),
  -- How long the money waits after the dinner before it can be paid out (disputes land here).
  payout_hold_hours int not null default 48 check (payout_hold_hours between 0 and 2160),
  -- Bumped whenever the chef contract text changes; chefs re-accept before the next payout.
  agreement_version int not null default 1 check (agreement_version >= 1),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

create trigger platform_settings_touch before update on public.platform_settings
  for each row execute function public.touch_updated_at();

-- The single row, for use inside other SQL functions.
create function public.settings() returns public.platform_settings
language sql stable security definer set search_path = public as $$
  select * from public.platform_settings where id = 1;
$$;

alter table public.platform_settings enable row level security;

create policy platform_settings_read on public.platform_settings for select using (true);
create policy platform_settings_admin on public.platform_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- There is one row and it stays that way: no inserts, no deletes, not even by an admin.
create function public.platform_settings_single() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'platform_settings has exactly one row';
end $$;

create trigger platform_settings_no_insert before insert on public.platform_settings
  for each row when (new.id is distinct from 1) execute function public.platform_settings_single();
create trigger platform_settings_no_delete before delete on public.platform_settings
  for each row execute function public.platform_settings_single();
