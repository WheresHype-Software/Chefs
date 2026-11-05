-- Ao Lume: pagamentos. As sete migrações, por ordem, numa só transação.
-- Se alguma instrução falhar, nada fica aplicado. Deve terminar em COMMIT.

begin;


-- ============================================================
-- 20261105000001_payments_settings.sql
-- ============================================================

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


-- ============================================================
-- 20261105000002_payments_schema.sql
-- ============================================================

-- Ao Lume: payments, ledger and payouts
--
-- The client pays the signal through the app; the platform keeps a commission on the whole booking
-- value and transfers the rest to the chef after the dinner.
--
-- Three rules shape everything below:
--   1. No amount ever comes from a browser. The numbers are computed here and frozen on the
--      booking the moment the chef accepts.
--   2. The money tables are append-only. A mistake is corrected with a new row, never by editing
--      or deleting an old one — including by an admin, including by the service role.
--   3. Nobody writes to these tables directly. Everything goes through the functions below or
--      through the server with the secret key.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.payment_method as enum ('mbway', 'multibanco', 'card');
create type public.payment_status as enum ('created', 'pending', 'paid', 'failed', 'expired', 'refunded', 'partially_refunded');
create type public.deposit_status as enum ('not_required', 'due', 'pending', 'paid', 'overdue', 'refunded', 'partially_refunded');
create type public.refund_status as enum ('requested', 'needs_iban', 'manual_pending', 'sent', 'done', 'failed');
create type public.ledger_kind as enum ('deposit_in', 'commission', 'payout', 'refund', 'adjustment');
create type public.payout_status as enum ('due', 'held', 'batched', 'paid', 'cancelled');
create type public.batch_status as enum ('draft', 'exported', 'paid', 'cancelled');

-- ---------------------------------------------------------------------------
-- What a booking is worth, frozen when the chef accepts
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column booking_value numeric(10, 2),
  add column deposit_amount numeric(10, 2),
  add column commission_amount numeric(10, 2),
  add column payout_amount numeric(10, 2),
  add column commission_percent_snapshot numeric(5, 2),
  add column money_frozen_at timestamptz,
  add column money_capped boolean not null default false,
  add column deposit_status public.deposit_status not null default 'not_required',
  add column deposit_due_at timestamptz,
  add column deposit_paid_at timestamptz,
  add column payout_due_at timestamptz;

create index bookings_deposit_due_idx on public.bookings (deposit_status, deposit_due_at);

-- A chef can be stopped from receiving money without being hidden from the site: the page stays
-- up, the bookings carry on, only the transfer waits.
alter table public.chefs
  add column payouts_blocked boolean not null default false,
  add column payouts_blocked_reason text,
  add column payouts_blocked_at timestamptz;

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  kind text not null default 'deposit' check (kind in ('deposit')),
  method public.payment_method not null,
  amount numeric(10, 2) not null check (amount > 0),
  status public.payment_status not null default 'created',
  provider text not null default 'eupago',
  -- What EuPago gives back: the reference we sent, and their own transaction id (trid).
  provider_reference text,
  provider_transaction_id text,
  mb_entity text,
  mb_reference text,
  mb_expires_at timestamptz,
  -- Never the phone itself: MB WAY payments are identified by a masked number in every screen.
  phone_masked text,
  refunded_amount numeric(10, 2) not null default 0 check (refunded_amount >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint payments_refund_within_amount check (refunded_amount <= amount)
);

create index payments_booking_idx on public.payments (booking_id, created_at desc);
create index payments_status_idx on public.payments (status);
create unique index payments_provider_reference_idx on public.payments (provider, provider_reference)
  where provider_reference is not null;
create unique index payments_provider_trid_idx on public.payments (provider, provider_transaction_id)
  where provider_transaction_id is not null;

-- Every notification EuPago sends us and every status we poll, exactly as received. This table is
-- how a repeated webhook stays harmless and how an argument about "we never got paid" is settled.
create table public.payment_events (
  id bigserial primary key,
  payment_id uuid references public.payments (id) on delete set null,
  source text not null check (source in ('webhook', 'poll', 'admin')),
  type text not null,
  -- False means the signature did not check out: the event is kept as evidence and ignored.
  signature_valid boolean not null default true,
  provider_reference text,
  provider_transaction_id text,
  payload jsonb not null default '{}',
  received_at timestamptz not null default now()
);

create index payment_events_payment_idx on public.payment_events (payment_id, received_at desc);
create index payment_events_reference_idx on public.payment_events (provider_reference);

-- Refunds. MB WAY and card go back by API; a Multibanco reference cannot, so it waits for the
-- client's IBAN (asked through a one-time link, never by plain email) and is paid by the bank.
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  booking_id uuid not null references public.bookings (id) on delete restrict,
  amount numeric(10, 2) not null check (amount > 0),
  reason text not null,
  status public.refund_status not null default 'requested',
  provider_refund_id text,
  -- Only for manual refunds, encrypted with the application key, erased once the refund is done.
  client_iban_encrypted text,
  client_iban_last4 text,
  client_iban_holder text,
  requested_by uuid references public.profiles (id),
  bank_reference text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index refunds_booking_idx on public.refunds (booking_id);
create index refunds_status_idx on public.refunds (status);

-- ---------------------------------------------------------------------------
-- Ledger: the truth about what we owe each chef
-- ---------------------------------------------------------------------------
-- Signed amounts, from the chef's point of view. The balance of a chef is the sum of their rows.
-- Append-only: a correction is another row with a reason, so the history is never rewritten.
create table public.ledger_entries (
  id bigserial primary key,
  chef_id uuid not null references public.chefs (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete set null,
  payout_id uuid,
  kind public.ledger_kind not null,
  amount numeric(10, 2) not null,
  reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index ledger_chef_idx on public.ledger_entries (chef_id, created_at desc);
create index ledger_booking_idx on public.ledger_entries (booking_id);

-- ---------------------------------------------------------------------------
-- Payouts
-- ---------------------------------------------------------------------------
create sequence public.payout_batch_seq start 1;

create table public.payout_batches (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('LOTE-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.payout_batch_seq')::text, 3, '0')),
  status public.batch_status not null default 'draft',
  total numeric(12, 2) not null default 0,
  chef_count int not null default 0,
  sepa_path text,
  csv_path text,
  bank_reference text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  exported_at timestamptz,
  paid_at timestamptz,
  cancelled_reason text
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete restrict,
  -- Null for an admin adjustment that is not tied to one booking.
  booking_id uuid references public.bookings (id) on delete set null,
  batch_id uuid references public.payout_batches (id) on delete set null,
  amount numeric(10, 2) not null,
  status public.payout_status not null default 'due',
  due_at timestamptz not null default now(),
  iban_last4 text,
  hold_reason text,
  reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- One payout per booking: the trigger that creates them must never make two.
create unique index payouts_booking_idx on public.payouts (booking_id) where booking_id is not null;
create index payouts_chef_idx on public.payouts (chef_id, status);
create index payouts_batch_idx on public.payouts (batch_id);

alter table public.ledger_entries
  add constraint ledger_payout_fk foreign key (payout_id) references public.payouts (id) on delete set null;

-- The document handed to the chef: "we are paying you X, your signal less our commission".
-- Not an invoice, and it says so. Issued under the contract the chef accepted at sign-up.
create sequence public.payout_document_seq start 1;

create table public.payout_documents (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.payouts (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete set null,
  chef_id uuid not null references public.chefs (id) on delete restrict,
  number text not null unique,
  issued_at timestamptz not null default now(),
  -- Everything the document says, as it said it: the chef's legal data and the amounts, copied at
  -- issue time so a later profile edit cannot change a document already handed over.
  snapshot jsonb not null,
  body_sha256 text not null,
  -- The document as it was handed over, in the private payout-docs bucket.
  document_path text,
  agreement_version int not null,
  status text not null default 'issued' check (status in ('issued', 'void')),
  void_reason text,
  -- The chef's one-click confirmation. The contract already covers it; this makes it undeniable.
  acknowledged_at timestamptz,
  acknowledged_ip text,
  acknowledged_user_agent text
);

create index payout_documents_chef_idx on public.payout_documents (chef_id, issued_at desc);
create index payout_documents_payout_idx on public.payout_documents (payout_id);

-- ---------------------------------------------------------------------------
-- Append-only: history is not editable, by anyone
-- ---------------------------------------------------------------------------
create function public.refuse_write() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception '% is append-only: correct it with a new row, never by changing this one', tg_table_name;
end $$;

create trigger payment_events_append_only before update or delete on public.payment_events
  for each row execute function public.refuse_write();
create trigger ledger_entries_append_only before update or delete on public.ledger_entries
  for each row execute function public.refuse_write();
create trigger payouts_no_delete before delete on public.payouts
  for each row execute function public.refuse_write();
create trigger payments_no_delete before delete on public.payments
  for each row execute function public.refuse_write();

-- A document can only ever be acknowledged or voided. Its content is fixed at issue.
create function public.payout_documents_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'a payment document is never deleted: void it and issue another';
  end if;
  if new.number is distinct from old.number
     or new.snapshot is distinct from old.snapshot
     or new.body_sha256 is distinct from old.body_sha256
     or new.payout_id is distinct from old.payout_id
     or new.chef_id is distinct from old.chef_id
     or new.issued_at is distinct from old.issued_at
     or new.agreement_version is distinct from old.agreement_version then
    raise exception 'a payment document cannot be changed after it is issued';
  end if;
  if old.status = 'void' and new.status <> 'void' then
    raise exception 'a voided document cannot come back';
  end if;
  return new;
end $$;

create trigger payout_documents_guard before update or delete on public.payout_documents
  for each row execute function public.payout_documents_guard();

-- ---------------------------------------------------------------------------
-- The arithmetic, mirrored from lib/money.ts. The two change together.
-- ---------------------------------------------------------------------------
create type public.booking_money as (
  deposit numeric(10, 2),
  commission numeric(10, 2),
  payout numeric(10, 2),
  capped boolean
);

create function public.compute_booking_money(p_value numeric, p_deposit_percent int)
returns public.booking_money
language plpgsql stable security definer set search_path = public as $$
declare
  s public.platform_settings := public.settings();
  m public.booking_money;
  v_wanted numeric(10, 2);
begin
  m := (0, 0, 0, false)::public.booking_money;
  if p_value is null or p_value <= 0 or coalesce(p_deposit_percent, 0) <= 0 then return m; end if;

  m.deposit := round(p_value * least(p_deposit_percent, 100) / 100.0, 2);
  v_wanted := greatest(round(p_value * s.commission_percent / 100.0, 2), s.commission_min);
  -- Never claim more than we actually hold, whatever the rules say.
  m.commission := least(v_wanted, m.deposit);
  m.payout := m.deposit - m.commission;
  m.capped := m.commission < v_wanted;
  return m;
end $$;

/** The smallest signal a chef may ask for: enough to cover the commission and still pay them. */
create function public.required_deposit_percent() returns int
language sql stable security definer set search_path = public as $$
  select ceil(commission_percent + deposit_margin_percent)::int from public.platform_settings where id = 1;
$$;

create function public.payments_on() returns boolean
language sql stable security definer set search_path = public as $$
  select payments_enabled from public.platform_settings where id = 1;
$$;

-- Chef balance: what we owe them right now, from the ledger and nowhere else.
create function public.chef_balance(p_chef uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0) from public.ledger_entries where chef_id = p_chef;
$$;

-- Balances are read by the server when building a payout batch, never from a browser.
revoke execute on function public.chef_balance(uuid) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Booking lifecycle: freeze the money on accept, gate confirm on the signal,
-- open a payout on completion.
-- ---------------------------------------------------------------------------
create or replace function public.booking_status_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor text := coalesce(nullif(current_setting('app.actor', true), ''),
                           case when old.chef_id = public.my_chef_id() then 'chef'
                                when public.is_admin() then 'admin' else 'system' end);
  ok boolean;
  v_chef_name text;
  s public.platform_settings := public.settings();
  v_deposit_percent int;
  v_value numeric(10, 2);
  m public.booking_money;
begin
  -- Chefs may only change workflow fields, never who/what was booked.
  if v_actor = 'chef' and (
    new.client_id <> old.client_id or new.chef_id <> old.chef_id or new.offer_id is distinct from old.offer_id
    or new.guests <> old.guests or new.address is distinct from old.address
  ) then
    raise exception 'field_change_not_allowed';
  end if;

  -- Money is set by the server, never by a chef or a client editing a booking.
  if v_actor in ('chef', 'client') and (
    new.booking_value is distinct from old.booking_value
    or new.deposit_amount is distinct from old.deposit_amount
    or new.commission_amount is distinct from old.commission_amount
    or new.payout_amount is distinct from old.payout_amount
    or new.deposit_status is distinct from old.deposit_status
  ) then
    raise exception 'money_change_not_allowed';
  end if;

  if new.status = old.status then return new; end if;

  ok := case
    when v_actor in ('system', 'admin') then true
    when v_actor = 'chef' then
      (old.status = 'requested' and new.status in ('accepted', 'declined', 'change_proposed', 'cancelled'))
      or (old.status = 'change_proposed' and new.status in ('declined', 'cancelled'))
      or (old.status = 'accepted' and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('completed', 'cancelled'))
    when v_actor = 'client' then
      (old.status in ('requested', 'accepted', 'change_proposed', 'confirmed') and new.status = 'cancelled')
      or (old.status = 'change_proposed' and new.status = 'accepted')
    else false
  end;
  if not ok then
    raise exception 'invalid_transition: % -> % by %', old.status, new.status, v_actor;
  end if;

  if new.status = 'accepted' then
    new.accepted_at := now();
    if new.fulfilment_mode = 'pickup' and new.pickup_code is null then
      new.pickup_code := lpad((floor(random() * 10000))::int::text, 4, '0');
    end if;

    -- Freeze the money. A later change to the commission never reaches a booking already accepted.
    if s.payments_enabled and new.money_frozen_at is null then
      select deposit_percent into v_deposit_percent from public.chefs where id = new.chef_id;
      v_value := coalesce(new.quoted_price, new.estimate);
      if v_value is null or coalesce(v_deposit_percent, 0) <= 0 then
        new.deposit_status := 'not_required';
      else
        if v_deposit_percent < public.required_deposit_percent() and v_actor <> 'admin' then
          raise exception 'deposit_percent_too_low';
        end if;
        m := public.compute_booking_money(v_value, v_deposit_percent);
        new.booking_value := v_value;
        new.deposit_amount := m.deposit;
        new.commission_amount := m.commission;
        new.payout_amount := m.payout;
        new.money_capped := m.capped;
        new.commission_percent_snapshot := s.commission_percent;
        new.money_frozen_at := now();
        new.deposit_status := 'due';
        new.deposit_due_at := now() + make_interval(hours => s.deposit_due_hours);
      end if;
    end if;

  elsif new.status = 'confirmed' then
    -- With payments on, a booking is only confirmed once the signal is actually in.
    if new.deposit_status in ('due', 'pending', 'overdue') and v_actor <> 'admin' then
      raise exception 'deposit_not_paid';
    end if;
    new.confirmed_at := now();

  elsif new.status = 'completed' then
    new.completed_at := now();
    if new.deposit_status = 'paid' and coalesce(new.payout_amount, 0) > 0 then
      new.payout_due_at := now() + make_interval(hours => s.payout_hold_hours);
    end if;

  elsif new.status = 'cancelled' and new.cancelled_by is null then
    new.cancelled_by := v_actor;
  end if;

  insert into public.booking_events (booking_id, from_status, to_status, actor)
  values (new.id, old.status, new.status, v_actor);

  select split_part(display_name, ' ', 1) into v_chef_name from public.chefs where id = new.chef_id;
  perform public.post_system_message(new.id, case new.status
    when 'accepted' then v_chef_name || ' aceitou o pedido'
      || case when new.deposit_status = 'due' then ' · falta pagar o sinal de ' || new.deposit_amount || ' €' else '' end
    when 'declined' then v_chef_name || ' recusou o pedido' || coalesce(' · ' || new.decline_reason, '')
    when 'change_proposed' then v_chef_name || ' propôs ' || coalesce(to_char(new.proposed_date, 'DD/MM'), 'outra data')
      || coalesce(' · ' || new.proposed_time, '') || coalesce(' · ' || new.quoted_price || ' €', '')
    when 'confirmed' then 'Reserva confirmada'
    when 'completed' then 'Reserva concluída · já pode avaliar'
    when 'cancelled' then 'Reserva cancelada'
    when 'expired' then 'O pedido expirou sem resposta'
    else new.status::text end);

  if new.status = 'completed' then
    perform set_config('app.internal', 'on', true);
    update public.chefs set completed_bookings = completed_bookings + 1 where id = new.chef_id;
    perform set_config('app.internal', 'off', true);
  end if;
  return new;
end $$;

-- A payout is opened only after the money has sat still for the hold period. The row is created
-- when the booking completes; the cron in a later migration moves it from 'held' to 'due'.
create function public.open_payout_for_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_blocked boolean;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;
  if new.deposit_status <> 'paid' or coalesce(new.payout_amount, 0) <= 0 then return new; end if;

  select payouts_blocked into v_blocked from public.chefs where id = new.chef_id;
  insert into public.payouts (chef_id, booking_id, amount, status, due_at, hold_reason)
  values (
    new.chef_id, new.id, new.payout_amount,
    case when v_blocked then 'held' else 'due' end,
    coalesce(new.payout_due_at, now()),
    case when v_blocked then 'chef_payouts_blocked' end
  )
  on conflict (booking_id) where booking_id is not null do nothing;
  return new;
end $$;

create trigger bookings_open_payout after update on public.bookings
  for each row execute function public.open_payout_for_booking();

-- Chefs cannot unblock their own payouts.
create or replace function public.guard_chef_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Admins, server jobs and internal counters (ratings, completed bookings) pass through.
  if public.is_admin() or auth.uid() is null or current_setting('app.internal', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.badges := '{}';
    new.rating_avg := null;
    new.review_count := 0;
    new.completed_bookings := 0;
    new.is_promoted := false;
    new.promoted_until := null;
    new.approved_at := null;
    new.verification_notes := null;
    new.payouts_blocked := false;
    new.payouts_blocked_reason := null;
    new.payouts_blocked_at := null;
    if public.payments_on() and coalesce(new.deposit_percent, 0) > 0
       and new.deposit_percent < public.required_deposit_percent() then
      raise exception 'deposit_percent_too_low';
    end if;
    return new;
  end if;
  -- A chef may only move draft/rejected -> pending (submit for review).
  if new.status is distinct from old.status
     and not (old.status in ('draft', 'rejected') and new.status = 'pending') then
    raise exception 'status_change_not_allowed';
  end if;
  new.badges := old.badges;
  new.rating_avg := old.rating_avg;
  new.review_count := old.review_count;
  new.completed_bookings := old.completed_bookings;
  new.is_promoted := old.is_promoted;
  new.promoted_until := old.promoted_until;
  new.approved_at := old.approved_at;
  new.verification_notes := old.verification_notes;
  new.payouts_blocked := old.payouts_blocked;
  new.payouts_blocked_reason := old.payouts_blocked_reason;
  new.payouts_blocked_at := old.payouts_blocked_at;
  -- A signal too small to cover the commission would mean paying the chef nothing.
  if public.payments_on() and coalesce(new.deposit_percent, 0) > 0
     and new.deposit_percent < public.required_deposit_percent() then
    raise exception 'deposit_percent_too_low';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security: read what is yours, write nothing
-- ---------------------------------------------------------------------------
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.refunds enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.payout_batches enable row level security;
alter table public.payouts enable row level security;
alter table public.payout_documents enable row level security;

-- Payments: the chef of the booking and the signed-in client see them; nobody writes from a browser.
create policy payments_read on public.payments for select using (
  public.is_admin() or exists (
    select 1 from public.bookings b where b.id = booking_id
      and (b.chef_id = public.my_chef_id() or b.client_id = public.my_client_id())
  )
);
create policy payments_admin on public.payments for all using (public.is_admin()) with check (public.is_admin());

-- The raw provider traffic is admin-only: it carries phone numbers and provider internals.
create policy payment_events_admin on public.payment_events for select using (public.is_admin());

create policy refunds_admin on public.refunds for all using (public.is_admin()) with check (public.is_admin());
create policy refunds_client_read on public.refunds for select using (
  exists (select 1 from public.bookings b where b.id = booking_id and b.client_id = public.my_client_id())
);

create policy ledger_chef_read on public.ledger_entries for select using (
  chef_id = public.my_chef_id() or public.is_admin()
);

create policy payouts_chef_read on public.payouts for select using (
  chef_id = public.my_chef_id() or public.is_admin()
);
create policy payouts_admin on public.payouts for all using (public.is_admin()) with check (public.is_admin());

create policy payout_batches_admin on public.payout_batches for all using (public.is_admin()) with check (public.is_admin());

create policy payout_documents_chef_read on public.payout_documents for select using (
  chef_id = public.my_chef_id() or public.is_admin()
);
create policy payout_documents_admin on public.payout_documents for all using (public.is_admin()) with check (public.is_admin());

-- Belt and braces on top of RLS: no browser session writes to these tables, not even an admin one.
-- Every write to money is made by the server with the secret key (createAdminClient) or by a
-- security-definer function, which is what makes "no amount comes from a browser" enforceable.
revoke insert, update, delete on public.payments, public.payment_events, public.refunds,
  public.ledger_entries, public.payout_batches, public.payouts, public.payout_documents
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: payment documents and bank files are private
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('payout-docs', 'payout-docs', false)
on conflict (id) do nothing;

-- Written by the server with the secret key only. Chefs read their own documents through a
-- short-lived signed link, never by listing the bucket.
create policy "payout docs: admin reads" on storage.objects for select to authenticated
  using (bucket_id = 'payout-docs' and public.is_admin());


-- ============================================================
-- 20261105000003_chef_billing.sql
-- ============================================================

-- Ao Lume: the chef's fiscal identity, bank details and contract
--
-- Three jobs:
--   1. Hold what the law needs: legal name, NIF, fiscal address, and — because the platform now
--      intermediates the money — the DAC7 data the AT must be told once a year.
--   2. Hold the IBAN in a way that survives a database leak: the number arrives already encrypted
--      by the application, and even the chef's own session cannot read that column back.
--   3. Record the contract that makes the payment documents valid: which version, when, from where.
--
-- The dangerous operation here is not reading data, it is *changing the IBAN*. That is the one
-- move an attacker who gets into a chef's account would make, so it takes a confirmation link,
-- warns the address that is being replaced, and freezes payouts for three days afterwards.

create table public.chef_billing (
  chef_id uuid primary key references public.chefs (id) on delete cascade,

  -- Who the chef is, fiscally
  entity_type text not null default 'individual' check (entity_type in ('individual', 'company')),
  legal_name text,
  nif text check (nif is null or nif ~ '^\d{9}$'),
  vat_regime text not null default 'isento_art53' check (vat_regime in ('normal', 'isento_art53')),
  address_line text,
  postal_code text check (postal_code is null or postal_code ~ '^\d{4}-\d{3}$'),
  city text,
  country text not null default 'PT' check (country ~ '^[A-Z]{2}$'),

  -- DAC7 (DL 20/2022): what has to be reported about a seller on a platform.
  birth_date date,
  birth_place text,
  company_reg_number text,

  -- Where the money goes. iban_encrypted is AES-256-GCM from the application; the key is not in
  -- this database, so a dump of this table is a dump of nothing useful.
  iban_encrypted text,
  iban_last4 text,
  iban_holder text,
  iban_bic text,
  iban_changed_at timestamptz,
  -- A brand new IBAN needs a human to look at it before the first transfer leaves.
  iban_approved_at timestamptz,
  iban_approved_by uuid references public.profiles (id),

  -- A change waits here until the chef clicks the link in their email.
  iban_pending_encrypted text,
  iban_pending_last4 text,
  iban_pending_holder text,
  iban_pending_bic text,
  iban_pending_token_hash text,
  iban_pending_requested_at timestamptz,
  iban_pending_expires_at timestamptz,

  -- Set when the IBAN changes: nothing is transferred while this is in the future.
  payout_hold_until timestamptz,

  -- Founders and special arrangements, decided by an admin.
  commission_percent_override numeric(5, 2) check (commission_percent_override is null or commission_percent_override between 0 and 100),

  verified_at timestamptz,
  verified_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger chef_billing_touch before update on public.chef_billing
  for each row execute function public.touch_updated_at();

-- The contract that lets us collect the signal in the chef's name, keep the commission and issue
-- the payment documents without signing each one. Versioned: new text, new acceptance.
create table public.chef_agreements (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  version int not null,
  -- SHA-256 of the exact text shown on screen, so we can prove what was agreed to.
  body_sha256 text not null,
  accepted_at timestamptz not null default now(),
  ip text,
  user_agent text,
  revoked_at timestamptz,
  unique (chef_id, version)
);

create index chef_agreements_chef_idx on public.chef_agreements (chef_id, version desc);

-- An acceptance is a fact, not a record to tidy up later.
create trigger chef_agreements_append_only before update or delete on public.chef_agreements
  for each row execute function public.refuse_write();

-- ---------------------------------------------------------------------------
-- Writing: only through these functions, only for your own chef
-- ---------------------------------------------------------------------------
create function public.save_chef_billing(
  p_entity_type text,
  p_legal_name text,
  p_nif text,
  p_vat_regime text,
  p_address_line text,
  p_postal_code text,
  p_city text,
  p_country text default 'PT',
  p_birth_date date default null,
  p_birth_place text default null,
  p_company_reg_number text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_chef uuid := public.my_chef_id();
begin
  if v_chef is null then raise exception 'no_chef'; end if;

  insert into public.chef_billing as cb (
    chef_id, entity_type, legal_name, nif, vat_regime, address_line, postal_code, city, country,
    birth_date, birth_place, company_reg_number
  ) values (
    v_chef, p_entity_type, nullif(trim(p_legal_name), ''), nullif(regexp_replace(coalesce(p_nif, ''), '\D', '', 'g'), ''),
    p_vat_regime, nullif(trim(p_address_line), ''), nullif(trim(p_postal_code), ''), nullif(trim(p_city), ''),
    upper(coalesce(p_country, 'PT')), p_birth_date, nullif(trim(p_birth_place), ''), nullif(trim(p_company_reg_number), '')
  )
  on conflict (chef_id) do update set
    entity_type = excluded.entity_type,
    legal_name = excluded.legal_name,
    nif = excluded.nif,
    vat_regime = excluded.vat_regime,
    address_line = excluded.address_line,
    postal_code = excluded.postal_code,
    city = excluded.city,
    country = excluded.country,
    birth_date = excluded.birth_date,
    birth_place = excluded.birth_place,
    company_reg_number = excluded.company_reg_number,
    -- Fiscal data changing means the admin should look again before the next transfer.
    verified_at = case when cb.nif is distinct from excluded.nif then null else cb.verified_at end;
end $$;

/**
 * Step one of an IBAN change: park it. The application has already encrypted the number and
 * hashed the one-time token that goes out by email. Nothing is transferred to a parked IBAN.
 */
create function public.start_iban_change(
  p_encrypted text, p_last4 text, p_holder text, p_bic text, p_token_hash text, p_minutes int default 60
) returns void
language plpgsql security definer set search_path = public as $$
declare v_chef uuid := public.my_chef_id();
begin
  if v_chef is null then raise exception 'no_chef'; end if;
  if coalesce(trim(p_encrypted), '') = '' or coalesce(trim(p_token_hash), '') = '' then raise exception 'invalid_input'; end if;

  insert into public.chef_billing (chef_id, iban_pending_encrypted, iban_pending_last4, iban_pending_holder,
    iban_pending_bic, iban_pending_token_hash, iban_pending_requested_at, iban_pending_expires_at)
  values (v_chef, p_encrypted, p_last4, nullif(trim(p_holder), ''), nullif(trim(p_bic), ''), p_token_hash,
    now(), now() + make_interval(mins => greatest(p_minutes, 5)))
  on conflict (chef_id) do update set
    iban_pending_encrypted = excluded.iban_pending_encrypted,
    iban_pending_last4 = excluded.iban_pending_last4,
    iban_pending_holder = excluded.iban_pending_holder,
    iban_pending_bic = excluded.iban_pending_bic,
    iban_pending_token_hash = excluded.iban_pending_token_hash,
    iban_pending_requested_at = excluded.iban_pending_requested_at,
    iban_pending_expires_at = excluded.iban_pending_expires_at;
end $$;

/**
 * Step two: the chef clicked the link. The parked IBAN becomes the real one, payouts freeze for
 * three days, and the first transfer to it waits for an admin. Returns the last four digits.
 */
create function public.confirm_iban_change(p_token_hash text) returns text
language plpgsql security definer set search_path = public as $$
declare v_chef uuid := public.my_chef_id(); cb public.chef_billing;
begin
  if v_chef is null then raise exception 'no_chef'; end if;
  select * into cb from public.chef_billing where chef_id = v_chef for update;
  if not found or cb.iban_pending_token_hash is null then raise exception 'no_pending_change'; end if;
  if cb.iban_pending_expires_at < now() then raise exception 'link_expired'; end if;
  if cb.iban_pending_token_hash <> p_token_hash then raise exception 'invalid_token'; end if;

  update public.chef_billing set
    iban_encrypted = cb.iban_pending_encrypted,
    iban_last4 = cb.iban_pending_last4,
    iban_holder = coalesce(cb.iban_pending_holder, cb.iban_holder),
    iban_bic = cb.iban_pending_bic,
    iban_changed_at = now(),
    iban_approved_at = null,
    iban_approved_by = null,
    payout_hold_until = now() + interval '72 hours',
    iban_pending_encrypted = null,
    iban_pending_last4 = null,
    iban_pending_holder = null,
    iban_pending_bic = null,
    iban_pending_token_hash = null,
    iban_pending_requested_at = null,
    iban_pending_expires_at = null
  where chef_id = v_chef;
  return cb.iban_pending_last4;
end $$;

create function public.accept_chef_agreement(p_version int, p_sha text, p_ip text, p_user_agent text) returns void
language plpgsql security definer set search_path = public as $$
declare v_chef uuid := public.my_chef_id();
begin
  if v_chef is null then raise exception 'no_chef'; end if;
  insert into public.chef_agreements (chef_id, version, body_sha256, ip, user_agent)
  values (v_chef, p_version, p_sha, left(coalesce(p_ip, ''), 60), left(coalesce(p_user_agent, ''), 400))
  on conflict (chef_id, version) do nothing;
end $$;

/**
 * Everything that has to be true before money may leave for a chef. Used by the payout batch and
 * shown to the chef as a checklist, so nobody has to guess why a transfer is waiting.
 */
create function public.chef_payout_readiness(p_chef uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb;
begin
  -- Security definer: without this check, any id would reveal another chef's standing.
  -- auth.uid() is null means the server with the secret key (the payout batch builder), not a visitor.
  if auth.uid() is not null and p_chef is distinct from public.my_chef_id() and not public.is_admin() then
    raise exception 'not_allowed';
  end if;

  select jsonb_build_object(
    'hasFiscal', cb.chef_id is not null and cb.legal_name is not null and cb.nif is not null
                 and cb.address_line is not null and cb.postal_code is not null and cb.city is not null,
    'hasDac7', cb.chef_id is not null and (
                 (cb.entity_type = 'individual' and cb.birth_date is not null and cb.birth_place is not null)
                 or (cb.entity_type = 'company' and cb.company_reg_number is not null)),
    'hasIban', cb.iban_encrypted is not null,
    'ibanApproved', cb.iban_approved_at is not null,
    'ibanPending', cb.iban_pending_token_hash is not null,
    'onHold', coalesce(cb.payout_hold_until > now(), false),
    'holdUntil', cb.payout_hold_until,
    'agreementVersion', (select max(a.version) from public.chef_agreements a where a.chef_id = p_chef and a.revoked_at is null),
    'requiredAgreementVersion', (select agreement_version from public.platform_settings where id = 1),
    'blocked', coalesce(c.payouts_blocked, false),
    'blockedReason', c.payouts_blocked_reason
  )
  into v_result
  from public.chefs c
  left join public.chef_billing cb on cb.chef_id = c.id
  where c.id = p_chef;

  return v_result;
end $$;

/** True only when every condition above is met. The batch builder calls this and nothing else. */
create function public.chef_can_be_paid(p_chef uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (r->>'hasFiscal')::boolean and (r->>'hasDac7')::boolean and (r->>'hasIban')::boolean
     and (r->>'ibanApproved')::boolean and not (r->>'onHold')::boolean and not (r->>'blocked')::boolean
     and coalesce((r->>'agreementVersion')::int, 0) >= (r->>'requiredAgreementVersion')::int
  from (select public.chef_payout_readiness(p_chef) as r) t;
$$;

-- ---------------------------------------------------------------------------
-- Row level security and column privileges
-- ---------------------------------------------------------------------------
alter table public.chef_billing enable row level security;
alter table public.chef_agreements enable row level security;

create policy chef_billing_owner_read on public.chef_billing for select using (chef_id = public.my_chef_id());
create policy chef_billing_admin on public.chef_billing for all using (public.is_admin()) with check (public.is_admin());

create policy chef_agreements_owner_read on public.chef_agreements for select using (chef_id = public.my_chef_id());
create policy chef_agreements_admin on public.chef_agreements for all using (public.is_admin()) with check (public.is_admin());

-- No session writes these tables directly: the functions above and the server hold the pen.
revoke insert, update, delete on public.chef_billing, public.chef_agreements from anon, authenticated;

-- And nobody reads the encrypted numbers back through the API, not even their owner. The chef
-- sees the last four digits; the plain IBAN is assembled once, server-side, to make a bank file.
revoke select (iban_encrypted, iban_pending_encrypted, iban_pending_token_hash)
  on public.chef_billing from anon, authenticated;


-- ============================================================
-- 20261105000004_payment_functions.sql
-- ============================================================

-- Ao Lume: creating, confirming and expiring a signal payment
--
-- All of it lives in the database on purpose. A payment confirmation touches four tables at once
-- (payment, booking, ledger, chat) and must either happen completely or not at all; doing it from
-- the application would leave a window where the money is in and the booking is not confirmed.
--
-- Every one of these functions is safe to call twice. EuPago retries a webhook three times and
-- then hourly for a day, and our own reconciliation job calls the same path, so "exactly once" is
-- not something we can hope for — it is something we enforce here.

-- ---------------------------------------------------------------------------
-- Creating the payment the client is about to make
-- ---------------------------------------------------------------------------
create function public.create_deposit_payment(
  p_booking uuid,
  p_method public.payment_method,
  p_phone_masked text default null,
  p_token text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  v_existing public.payments;
  v_id uuid;
begin
  if public.booking_actor(p_booking, p_token) is distinct from 'client' then raise exception 'not_allowed'; end if;
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'booking_not_found'; end if;
  if b.status <> 'accepted' then raise exception 'booking_not_awaiting_payment'; end if;
  if b.deposit_status not in ('due', 'overdue') then raise exception 'deposit_not_due'; end if;
  if coalesce(b.deposit_amount, 0) <= 0 then raise exception 'nothing_to_pay'; end if;

  -- Anything left over from an earlier attempt stops being valid the moment a new one starts.
  update public.payments set status = 'expired'
   where booking_id = b.id and status in ('created', 'pending')
     and (expires_at is null or expires_at < now() + interval '1 minute');

  -- A live attempt with the same method is reused rather than duplicated: two open MB WAY
  -- requests for one booking is how a client ends up paying twice.
  select * into v_existing from public.payments
   where booking_id = b.id and method = p_method and status in ('created', 'pending')
     and (expires_at is null or expires_at > now())
   order by created_at desc limit 1;
  if found then return v_existing.id; end if;

  insert into public.payments (booking_id, method, amount, status, phone_masked)
  values (b.id, p_method, b.deposit_amount, 'created', p_phone_masked)
  returning id into v_id;

  update public.bookings set deposit_status = 'pending' where id = b.id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Recording what the provider told us, before acting on any of it
-- ---------------------------------------------------------------------------
create function public.record_payment_event(
  p_payment uuid,
  p_source text,
  p_type text,
  p_signature_valid boolean,
  p_reference text,
  p_trid text,
  p_payload jsonb
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  insert into public.payment_events (payment_id, source, type, signature_valid, provider_reference, provider_transaction_id, payload)
  values (p_payment, p_source, p_type, coalesce(p_signature_valid, false), p_reference, p_trid, coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- The money is in
-- ---------------------------------------------------------------------------
/**
 * Marks a payment paid and moves everything that follows from it. Returns true only for the call
 * that actually changed something, so a repeated webhook sends no second email.
 *
 * `p_amount` is what the provider says was paid. It must match what we asked for: a payment for a
 * different amount than the one on the booking is never treated as settling that booking.
 */
create function public.mark_payment_paid(p_payment uuid, p_trid text, p_amount numeric) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  p public.payments;
  b public.bookings;
begin
  select * into p from public.payments where id = p_payment for update;
  if not found then raise exception 'payment_not_found'; end if;
  if p.status in ('paid', 'refunded', 'partially_refunded') then return false; end if;
  if p_amount is not null and abs(p_amount - p.amount) > 0.005 then
    raise exception 'amount_mismatch: expected %, provider says %', p.amount, p_amount;
  end if;

  update public.payments set
    status = 'paid',
    paid_at = now(),
    provider_transaction_id = coalesce(p.provider_transaction_id, nullif(p_trid, ''))
  where id = p.id;

  select * into b from public.bookings where id = p.booking_id for update;

  -- The ledger learns two things at once: we are holding the chef's signal, and part of it is ours.
  insert into public.ledger_entries (chef_id, booking_id, kind, amount, reason) values
    (b.chef_id, b.id, 'deposit_in', b.deposit_amount, 'Sinal recebido do cliente'),
    (b.chef_id, b.id, 'commission', -b.commission_amount, 'Comissão Ao Lume');

  perform set_config('app.actor', 'system', true);

  if b.status = 'accepted' then
    update public.bookings set deposit_status = 'paid', deposit_paid_at = now(), status = 'confirmed' where id = b.id;
  else
    -- The money arrived for a booking that is no longer live (cancelled while the client paid, or
    -- already past). Record it and open a refund for the team rather than quietly keeping it.
    update public.bookings set deposit_status = 'paid', deposit_paid_at = now() where id = b.id;
    insert into public.refunds (payment_id, booking_id, amount, reason, status)
    values (p.id, b.id, p.amount, 'Pagamento recebido numa reserva já ' || b.status::text, 'requested');
    perform public.post_system_message(b.id, 'Pagamento recebido fora de tempo · a equipa vai tratar da devolução');
  end if;

  return true;
end $$;

/** A payment that failed, expired or was cancelled at the provider. Idempotent in the same way. */
create function public.mark_payment_unpaid(p_payment uuid, p_status public.payment_status) returns boolean
language plpgsql security definer set search_path = public as $$
declare p public.payments; b public.bookings;
begin
  if p_status not in ('failed', 'expired') then raise exception 'bad_status'; end if;
  select * into p from public.payments where id = p_payment for update;
  if not found then raise exception 'payment_not_found'; end if;
  if p.status <> 'created' and p.status <> 'pending' then return false; end if;

  update public.payments set status = p_status where id = p.id;

  -- The signal goes back to being owed, as long as the deadline has not passed.
  select * into b from public.bookings where id = p.booking_id for update;
  if b.deposit_status = 'pending' then
    perform set_config('app.actor', 'system', true);
    update public.bookings set
      deposit_status = case when b.deposit_due_at is not null and b.deposit_due_at < now() then 'overdue' else 'due' end
    where id = b.id;
  end if;
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- Deadlines
-- ---------------------------------------------------------------------------
/** The signal was never paid in time. The booking stays accepted; the chef decides what to do. */
create function public.expire_overdue_deposits() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform set_config('app.actor', 'system', true);

  update public.payments set status = 'expired'
   where status in ('created', 'pending') and expires_at is not null and expires_at < now();

  update public.bookings set deposit_status = 'overdue'
   where deposit_status in ('due', 'pending') and deposit_due_at is not null and deposit_due_at < now()
     and status = 'accepted';
  get diagnostics n = row_count;
  return n;
end $$;

-- Every five minutes: an MB WAY request is only alive for five.
select cron.schedule('ao-lume-expire-deposits', '*/5 * * * *', $$select public.expire_overdue_deposits()$$);

-- ---------------------------------------------------------------------------
-- What the client's payment screen is allowed to ask
-- ---------------------------------------------------------------------------
/**
 * The state of a payment, for the screen that waits while the client approves it in MB WAY. It
 * answers with the booking's own view of things, never with anything from the provider, and only
 * to whoever holds the booking.
 */
create function public.payment_state(p_booking uuid, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare b public.bookings; p public.payments;
begin
  if public.booking_actor(p_booking, p_token) is null then raise exception 'not_allowed'; end if;
  select * into b from public.bookings where id = p_booking;
  select * into p from public.payments where booking_id = p_booking order by created_at desc limit 1;

  return jsonb_build_object(
    'bookingStatus', b.status,
    'depositStatus', b.deposit_status,
    'depositAmount', b.deposit_amount,
    'depositDueAt', b.deposit_due_at,
    'payment', case when p.id is null then null else jsonb_build_object(
      'id', p.id,
      'method', p.method,
      'status', p.status,
      'amount', p.amount,
      'entity', p.mb_entity,
      'reference', p.mb_reference,
      'expiresAt', coalesce(p.mb_expires_at, p.expires_at),
      'phoneMasked', p.phone_masked,
      'createdAt', p.created_at
    ) end
  );
end $$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------
-- These are security definer, which means they run with the power to change money. Two of them
-- are safe for a browser to call because they check the caller against the booking first
-- (create_deposit_payment, payment_state). The rest decide outcomes and must only ever be reached
-- by the server with the secret key, or by cron. Without this, any signed-in user could mark a
-- stranger's payment as failed, or replay one as paid.
revoke execute on function public.mark_payment_paid(uuid, text, numeric) from anon, authenticated;
revoke execute on function public.mark_payment_unpaid(uuid, public.payment_status) from anon, authenticated;
revoke execute on function public.record_payment_event(uuid, text, text, boolean, text, text, jsonb) from anon, authenticated;
revoke execute on function public.expire_overdue_deposits() from anon, authenticated;


-- ============================================================
-- 20261105000005_payouts.sql
-- ============================================================

-- Ao Lume: paying the chef
--
-- EuPago has no endpoint that sends money to a chef's IBAN — their payout endpoints only report
-- what has already settled into our account. So the transfer is a bank operation: this builds the
-- batch and the file, a person executes it, and the result is recorded here. That is a feature,
-- not a workaround: it keeps a human between the application and money leaving the company.
--
-- The batch only ever contains chefs who can lawfully be paid (chef_can_be_paid: fiscal data,
-- DAC7 data, a verified IBAN, no hold, a current contract). Everyone else waits, visibly.

create function public.next_payout_document_number() returns text
language sql security definer set search_path = public as $$
  select 'AL-PAG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.payout_document_seq')::text, 4, '0');
$$;

/**
 * Collects everything owed and ready into one batch. Returns the batch id, or null when there is
 * nothing to pay. A payout whose chef is not ready is left alone, so it joins the next batch
 * automatically once they sort their details out.
 */
create function public.build_payout_batch(p_created_by uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_batch uuid;
  v_total numeric(12, 2);
  v_chefs int;
  n int;
begin
  insert into public.payout_batches (created_by) values (p_created_by) returning id into v_batch;

  -- skip locked: two admins pressing the button at once must not put one payout in two batches.
  update public.payouts set batch_id = v_batch, status = 'batched'
   where id in (
     select p.id from public.payouts p
      where p.status = 'due' and p.due_at <= now() and p.amount <> 0
        and public.chef_can_be_paid(p.chef_id)
      for update skip locked
   );
  get diagnostics n = row_count;

  if n = 0 then
    delete from public.payout_batches where id = v_batch;
    return null;
  end if;

  select coalesce(sum(amount), 0), count(distinct chef_id) into v_total, v_chefs
    from public.payouts where batch_id = v_batch;

  update public.payout_batches set total = v_total, chef_count = v_chefs where id = v_batch;
  return v_batch;
end $$;

/** The bank file has been generated and downloaded. */
create function public.mark_batch_exported(p_batch uuid, p_sepa_path text, p_csv_path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.payout_batches
     set status = 'exported', sepa_path = p_sepa_path, csv_path = p_csv_path, exported_at = now()
   where id = p_batch and status = 'draft';
  if not found then raise exception 'batch_not_draft'; end if;
end $$;

/**
 * The transfers left the bank. This is the moment the chef's balance actually drops, so the
 * ledger learns about it here and nowhere else.
 */
create function public.mark_batch_paid(p_batch uuid, p_bank_reference text, p_by uuid default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.payout_batches set status = 'paid', paid_at = now(), bank_reference = nullif(trim(p_bank_reference), '')
   where id = p_batch and status in ('draft', 'exported');
  if not found then raise exception 'batch_not_payable'; end if;

  insert into public.ledger_entries (chef_id, booking_id, payout_id, kind, amount, reason, created_by)
  select p.chef_id, p.booking_id, p.id, 'payout', -p.amount,
         'Transferência ' || coalesce(nullif(trim(p_bank_reference), ''), '(sem referência)'), p_by
    from public.payouts p where p.batch_id = p_batch and p.status = 'batched';

  update public.payouts set status = 'paid', paid_at = now() where batch_id = p_batch and status = 'batched';
  get diagnostics n = row_count;
  return n;
end $$;

/** Pulls a batch apart again, as long as the money has not left. */
create function public.cancel_payout_batch(p_batch uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  update public.payouts set batch_id = null, status = 'due' where batch_id = p_batch and status = 'batched';
  update public.payout_batches set status = 'cancelled', cancelled_reason = p_reason
   where id = p_batch and status in ('draft', 'exported');
  if not found then raise exception 'batch_not_cancellable'; end if;
end $$;

/** Holds one chef's payouts back, with a reason the chef can be told. */
create function public.hold_payout(p_payout uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  update public.payouts set status = 'held', hold_reason = p_reason where id = p_payout and status = 'due';
  if not found then raise exception 'payout_not_due'; end if;
end $$;

create function public.release_payout(p_payout uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.payouts set status = 'due', hold_reason = null where id = p_payout and status = 'held';
  if not found then raise exception 'payout_not_held'; end if;
end $$;

/**
 * An adjustment: money owed to a chef, or taken back, outside any one booking. Always with a
 * reason, because this is the one place an amount can be invented rather than computed.
 */
create function public.add_payout_adjustment(p_chef uuid, p_amount numeric, p_reason text, p_by uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  if p_amount = 0 then raise exception 'amount_required'; end if;

  insert into public.payouts (chef_id, amount, status, due_at, reason, created_by)
  values (p_chef, round(p_amount, 2), 'due', now(), p_reason, p_by) returning id into v_id;

  insert into public.ledger_entries (chef_id, payout_id, kind, amount, reason, created_by)
  values (p_chef, v_id, 'adjustment', round(p_amount, 2), p_reason, p_by);
  return v_id;
end $$;

/** The chef's one-click confirmation of a document. The contract already covers it; this is proof. */
create function public.acknowledge_payout_document(p_document uuid, p_ip text, p_user_agent text) returns void
language plpgsql security definer set search_path = public as $$
declare v_chef uuid := public.my_chef_id();
begin
  update public.payout_documents set
    acknowledged_at = now(),
    acknowledged_ip = left(coalesce(p_ip, ''), 60),
    acknowledged_user_agent = left(coalesce(p_user_agent, ''), 400)
  where id = p_document and chef_id = v_chef and acknowledged_at is null and status = 'issued';
  -- Silent when it was already acknowledged: pressing twice is not an error.
end $$;

/** What the chef sees on their payments page, in one query. */
create function public.chef_payout_summary(p_chef uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if p_chef is distinct from public.my_chef_id() and not public.is_admin() then raise exception 'not_allowed'; end if;
  select jsonb_build_object(
    'balance', public.chef_balance(p_chef),
    'held', coalesce((select sum(amount) from public.payouts where chef_id = p_chef and status = 'held'), 0),
    'waiting', coalesce((select sum(amount) from public.payouts where chef_id = p_chef and status = 'due' and due_at > now()), 0),
    'due', coalesce((select sum(amount) from public.payouts where chef_id = p_chef and status = 'due' and due_at <= now()), 0),
    'batched', coalesce((select sum(amount) from public.payouts where chef_id = p_chef and status = 'batched'), 0),
    'paidThisYear', coalesce((select sum(amount) from public.payouts
       where chef_id = p_chef and status = 'paid' and paid_at >= date_trunc('year', now())), 0),
    'toAcknowledge', (select count(*) from public.payout_documents
       where chef_id = p_chef and status = 'issued' and acknowledged_at is null)
  ) into v;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------
-- Everything that moves money or builds a batch is the server's job, done with the secret key
-- after an admin is authenticated. Only the chef's own two calls stay reachable from a session.
revoke execute on function public.build_payout_batch(uuid) from anon, authenticated;
revoke execute on function public.mark_batch_exported(uuid, text, text) from anon, authenticated;
revoke execute on function public.mark_batch_paid(uuid, text, uuid) from anon, authenticated;
revoke execute on function public.cancel_payout_batch(uuid, text) from anon, authenticated;
revoke execute on function public.hold_payout(uuid, text) from anon, authenticated;
revoke execute on function public.release_payout(uuid) from anon, authenticated;
revoke execute on function public.add_payout_adjustment(uuid, numeric, text, uuid) from anon, authenticated;
revoke execute on function public.next_payout_document_number() from anon, authenticated;


-- ============================================================
-- 20261105000006_refunds.sql
-- ============================================================

-- Ao Lume: sending money back
--
-- Four things can need a refund: the chef cancels after the signal is paid, the chef never shows
-- up, the client cancels within the chef's own flexible window, or the team decides. Two of them
-- can be done through EuPago (MB WAY and card go straight back to where they came from); a
-- Multibanco reference has no return path at all, so that money goes back by bank transfer and
-- needs the client's IBAN — which is asked for on their own booking page, never by email.
--
-- The commission always follows the refund, in proportion. If the client gets everything back,
-- we keep nothing; if they get half back, we keep half the commission. The alternative — keeping
-- a commission on money that was returned — would leave the chef owing us for a booking that
-- never happened.

create function public.request_refund(
  p_payment uuid,
  p_amount numeric,
  p_reason text,
  p_by uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare p public.payments; v_id uuid; v_status public.refund_status;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  select * into p from public.payments where id = p_payment for update;
  if not found then raise exception 'payment_not_found'; end if;
  if p.status not in ('paid', 'partially_refunded') then raise exception 'payment_not_refundable'; end if;
  if p_amount <= 0 or p_amount > p.amount - p.refunded_amount then raise exception 'amount_out_of_range'; end if;

  -- A Multibanco reference cannot be reversed: that one waits for an IBAN.
  v_status := case when p.method = 'multibanco' then 'needs_iban' else 'requested' end;

  insert into public.refunds (payment_id, booking_id, amount, reason, status, requested_by)
  values (p.id, p.booking_id, round(p_amount, 2), p_reason, v_status, p_by)
  returning id into v_id;

  if v_status = 'needs_iban' then
    perform public.post_system_message(p.booking_id,
      'Devolução de ' || round(p_amount, 2) || ' € a tratar · pedimos o IBAN ao cliente');
  end if;
  return v_id;
end $$;

/**
 * The money is on its way back. Everything that follows from that happens here: the payment, the
 * booking, the ledger and any payout still waiting for this booking.
 */
create function public.mark_refund_done(p_refund uuid, p_provider_refund_id text, p_bank_reference text) returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.refunds;
  p public.payments;
  b public.bookings;
  v_reversal numeric(10, 2);
  v_total numeric(10, 2);
begin
  select * into r from public.refunds where id = p_refund for update;
  if not found then raise exception 'refund_not_found'; end if;
  if r.status = 'done' then return; end if;

  select * into p from public.payments where id = r.payment_id for update;
  select * into b from public.bookings where id = r.booking_id for update;

  v_total := p.refunded_amount + r.amount;
  update public.payments set
    refunded_amount = v_total,
    status = case when v_total >= p.amount then 'refunded' else 'partially_refunded' end
  where id = p.id;

  -- Our commission goes back in the same proportion as the money.
  v_reversal := case when coalesce(b.deposit_amount, 0) > 0
    then round(coalesce(b.commission_amount, 0) * (r.amount / b.deposit_amount), 2) else 0 end;

  insert into public.ledger_entries (chef_id, booking_id, kind, amount, reason) values
    (b.chef_id, b.id, 'refund', -r.amount, 'Devolução ao cliente · ' || r.reason);
  if v_reversal <> 0 then
    insert into public.ledger_entries (chef_id, booking_id, kind, amount, reason) values
      (b.chef_id, b.id, 'commission', v_reversal, 'Reversão da comissão sobre o valor devolvido');
  end if;

  -- A payout still waiting for this booking shrinks by what the chef no longer gets.
  update public.payouts set
    amount = greatest(0, amount - (r.amount - v_reversal)),
    status = case when greatest(0, amount - (r.amount - v_reversal)) = 0 then 'cancelled' else status end
  where booking_id = b.id and status in ('due', 'held');

  perform set_config('app.actor', 'system', true);
  update public.bookings set
    deposit_status = case when v_total >= coalesce(b.deposit_amount, p.amount) then 'refunded' else 'partially_refunded' end
  where id = b.id;

  update public.refunds set
    status = 'done',
    done_at = now(),
    provider_refund_id = nullif(trim(p_provider_refund_id), ''),
    bank_reference = nullif(trim(p_bank_reference), ''),
    -- The client's IBAN was borrowed for one transfer; it is not ours to keep.
    client_iban_encrypted = null
  where id = r.id;

  perform public.post_system_message(b.id, 'Devolução de ' || r.amount || ' € efetuada');
end $$;

create function public.mark_refund_failed(p_refund uuid, p_detail text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.refunds set status = 'failed', reason = reason || ' · falhou: ' || coalesce(p_detail, '')
   where id = p_refund and status <> 'done';
end $$;

-- ---------------------------------------------------------------------------
-- The client's side: giving us an IBAN for a refund we cannot push back
-- ---------------------------------------------------------------------------
/** What the booking page needs to know: is there a refund waiting for this client's IBAN? */
create function public.refund_awaiting_iban(p_booking uuid, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r public.refunds;
begin
  if public.booking_actor(p_booking, p_token) is null then raise exception 'not_allowed'; end if;
  select * into r from public.refunds
   where booking_id = p_booking and status = 'needs_iban' order by created_at desc limit 1;
  if not found then return null; end if;
  return jsonb_build_object('id', r.id, 'amount', r.amount, 'reason', r.reason);
end $$;

/** The client hands over an IBAN for this one refund. Encrypted before it ever gets here. */
create function public.submit_refund_iban(
  p_refund uuid, p_booking uuid, p_encrypted text, p_last4 text, p_holder text, p_token text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare r public.refunds;
begin
  if public.booking_actor(p_booking, p_token) is distinct from 'client' then raise exception 'not_allowed'; end if;
  select * into r from public.refunds where id = p_refund and booking_id = p_booking for update;
  if not found then raise exception 'refund_not_found'; end if;
  if r.status <> 'needs_iban' then raise exception 'not_waiting_for_iban'; end if;

  update public.refunds set
    status = 'manual_pending',
    client_iban_encrypted = p_encrypted,
    client_iban_last4 = p_last4,
    client_iban_holder = nullif(trim(p_holder), '')
  where id = r.id;
end $$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------
-- Deciding a refund and completing one are the server's, after an admin is authenticated. The
-- two the client needs are authorised against their own booking first.
revoke execute on function public.request_refund(uuid, numeric, text, uuid) from anon, authenticated;
revoke execute on function public.mark_refund_done(uuid, text, text) from anon, authenticated;
revoke execute on function public.mark_refund_failed(uuid, text) from anon, authenticated;


-- ============================================================
-- 20261105000007_support.sql
-- ============================================================

-- Ao Lume: asking us something
--
-- Once money goes through the platform, "reply to the email" stops being enough: a person whose
-- signal did not arrive needs somewhere to write that is not a chef's inbox, and the team needs
-- the booking reference next to the message. Nothing here is clever — a form, a thread, and an
-- inbox — but it is the difference between a complaint that gets answered and one that becomes a
-- chargeback.

create type public.ticket_status as enum ('open', 'answered', 'closed');

create sequence public.support_ref_seq start 1;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('AP-' || to_char(now(), 'MMDD') || '-' || lpad(nextval('public.support_ref_seq')::text, 4, '0')),
  -- Set when the person was signed in; a guest writes with their email only.
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  category text not null check (category in ('reserva', 'pagamento', 'conta', 'chef', 'outro')),
  booking_ref text,
  subject text not null,
  body text not null,
  status public.ticket_status not null default 'open',
  assigned_to uuid references public.profiles (id) on delete set null,
  -- Kept for rate limiting and abuse, not for analytics.
  ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_status_idx on public.support_tickets (status, created_at desc);
create index support_tickets_email_idx on public.support_tickets (email, created_at desc);

create trigger support_tickets_touch before update on public.support_tickets
  for each row execute function public.touch_updated_at();

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author text not null check (author in ('person', 'team')),
  body text not null check (length(body) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- Writing in
-- ---------------------------------------------------------------------------
/**
 * The public form. Anyone may call it, so it validates everything and limits itself: five
 * messages an hour from one address, ten from one network. The limit is in the database rather
 * than in the app because the app runs in more than one place.
 */
create function public.create_support_ticket(
  p_name text,
  p_email text,
  p_phone text,
  p_category text,
  p_subject text,
  p_body text,
  p_booking_ref text default null,
  p_ip text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
  v_ref text;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  if length(trim(coalesce(p_subject, ''))) < 3 then raise exception 'subject_required'; end if;
  if length(trim(coalesce(p_body, ''))) < 10 then raise exception 'body_required'; end if;
  if p_category not in ('reserva', 'pagamento', 'conta', 'chef', 'outro') then raise exception 'invalid_category'; end if;

  if (select count(*) from public.support_tickets where email = v_email and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_requests';
  end if;
  if p_ip is not null
     and (select count(*) from public.support_tickets where ip = p_ip and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_requests';
  end if;

  insert into public.support_tickets (profile_id, name, email, phone, category, booking_ref, subject, body, ip)
  values (auth.uid(), left(trim(p_name), 120), v_email, nullif(left(trim(coalesce(p_phone, '')), 30), ''),
          p_category, nullif(left(trim(coalesce(p_booking_ref, '')), 40), ''),
          left(trim(p_subject), 200), left(trim(p_body), 8000), left(coalesce(p_ip, ''), 60))
  returning id, ref into v_id, v_ref;

  insert into public.support_messages (ticket_id, author, body) values (v_id, 'person', left(trim(p_body), 8000));
  return jsonb_build_object('id', v_id, 'ref', v_ref);
end $$;

/** The team's reply. Admin only; the email itself is sent by the server. */
create function public.reply_to_ticket(p_ticket uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_allowed'; end if;
  if length(trim(coalesce(p_body, ''))) = 0 then raise exception 'body_required'; end if;
  insert into public.support_messages (ticket_id, author, body) values (p_ticket, 'team', left(trim(p_body), 8000));
  update public.support_tickets set status = 'answered' where id = p_ticket and status = 'open';
end $$;

create function public.set_ticket_status(p_ticket uuid, p_status public.ticket_status) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_allowed'; end if;
  update public.support_tickets set status = p_status where id = p_ticket;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- A signed-in person sees their own threads; everyone else works through the function above.
create policy support_tickets_own on public.support_tickets for select
  using (profile_id = auth.uid() or public.is_admin());
create policy support_tickets_admin on public.support_tickets for all
  using (public.is_admin()) with check (public.is_admin());

create policy support_messages_own on public.support_messages for select using (
  public.is_admin() or exists (
    select 1 from public.support_tickets t where t.id = ticket_id and t.profile_id = auth.uid()
  )
);
create policy support_messages_admin on public.support_messages for all
  using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete on public.support_tickets, public.support_messages from anon, authenticated;

commit;
