-- Ao Lume: três correções que só o primeiro pagamento a sério revelou.
--
-- 1. Atribuir um enum a partir de um CASE não é inferido: Postgres vê text e recusa. Acontecia ao
--    marcar um pagamento como falhado, o que deixava a linha presa em 'created' precisamente
--    quando o fornecedor tinha recusado — o pior momento para a aplicação ficar calada.
-- 2. Depois de uma tentativa, a reserva fica com deposit_status = 'pending', e isso impedia o
--    cliente de tentar de novo ou de mudar de método. Uma tentativa falhada passava a ser um beco.
-- 3. Reaproveitar uma tentativa anterior só faz sentido se ela chegou a existir no fornecedor.
--    Uma linha sem referência é lixo e tem de ser substituída, não devolvida ao cliente.

create or replace function public.mark_payment_unpaid(p_payment uuid, p_status public.payment_status) returns boolean
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
      deposit_status = (case
        when b.deposit_due_at is not null and b.deposit_due_at < now() then 'overdue'
        else 'due'
      end)::public.deposit_status
    where id = b.id;
  end if;
  return true;
end $$;

create or replace function public.mark_refund_done(p_refund uuid, p_provider_refund_id text, p_bank_reference text) returns void
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
    status = (case when v_total >= p.amount then 'refunded' else 'partially_refunded' end)::public.payment_status
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

  update public.payouts set
    amount = greatest(0, amount - (r.amount - v_reversal)),
    status = case when greatest(0, amount - (r.amount - v_reversal)) = 0 then 'cancelled' else status end
  where booking_id = b.id and status in ('due', 'held');

  perform set_config('app.actor', 'system', true);
  update public.bookings set
    deposit_status = (case
      when v_total >= coalesce(b.deposit_amount, p.amount) then 'refunded'
      else 'partially_refunded'
    end)::public.deposit_status
  where id = b.id;

  update public.refunds set
    status = 'done',
    done_at = now(),
    provider_refund_id = nullif(trim(p_provider_refund_id), ''),
    bank_reference = nullif(trim(p_bank_reference), ''),
    client_iban_encrypted = null
  where id = r.id;

  perform public.post_system_message(b.id, 'Devolução de ' || r.amount || ' € efetuada');
end $$;

create or replace function public.create_deposit_payment(
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
  -- 'pending' included: a client who abandoned one attempt must be able to start another, or
  -- change their mind about how to pay.
  if b.deposit_status not in ('due', 'overdue', 'pending') then raise exception 'deposit_not_due'; end if;
  if coalesce(b.deposit_amount, 0) <= 0 then raise exception 'nothing_to_pay'; end if;

  -- Anything left over stops being valid when a new attempt starts, including an attempt that
  -- never reached the provider and so has no reference to pay against.
  update public.payments set status = 'expired'
   where booking_id = b.id and status in ('created', 'pending')
     and (provider_reference is null or expires_at is null or expires_at < now() + interval '1 minute');

  -- A live attempt with the same method is reused rather than duplicated: two open MB WAY
  -- requests for one booking is how a client ends up paying twice. It has to be a real one.
  select * into v_existing from public.payments
   where booking_id = b.id and method = p_method and status in ('created', 'pending')
     and provider_reference is not null and (expires_at is null or expires_at > now())
   order by created_at desc limit 1;
  if found then return v_existing.id; end if;

  insert into public.payments (booking_id, method, amount, status, phone_masked)
  values (b.id, p_method, b.deposit_amount, 'created', p_phone_masked)
  returning id into v_id;

  update public.bookings set deposit_status = 'pending' where id = b.id;
  return v_id;
end $$;

-- CREATE OR REPLACE keeps the existing privileges, so the earlier revoke still stands for
-- mark_payment_unpaid and mark_refund_done. Stated here so nobody has to go and check.
