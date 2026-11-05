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
