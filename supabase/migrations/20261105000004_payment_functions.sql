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
