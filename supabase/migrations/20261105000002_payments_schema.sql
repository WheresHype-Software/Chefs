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
