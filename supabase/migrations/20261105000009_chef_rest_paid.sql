-- Ao Lume: o chef regista que recebeu o resto do valor
--
-- O sinal passa por nós; o restante é combinado e pago diretamente ao chef, fora da plataforma.
-- Sem forma de o registar, o chef fica sem saber, reserva a reserva, o que já recebeu e o que
-- ainda tem a receber — que é precisamente a conta que ele precisa de ter à mão.
--
-- Não é dinheiro nosso e não entra no livro-razão: é uma nota do chef sobre a sua própria conta.
-- Por isso vive na reserva e não em ledger_entries, e só o chef dessa reserva lhe pode tocar.

alter table public.bookings
  add column rest_paid_at timestamptz,
  add column rest_paid_amount numeric(10, 2) check (rest_paid_amount is null or rest_paid_amount >= 0);

create index bookings_rest_paid_idx on public.bookings (chef_id, rest_paid_at);

create function public.chef_set_rest_paid(p_booking uuid, p_paid boolean, p_amount numeric default null) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings; v_chef uuid := public.my_chef_id();
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'booking_not_found'; end if;
  if b.chef_id is distinct from v_chef and not public.is_admin() then raise exception 'not_allowed'; end if;
  if b.status not in ('confirmed', 'completed') then raise exception 'booking_not_confirmed'; end if;

  if p_paid then
    update public.bookings set
      rest_paid_at = coalesce(b.rest_paid_at, now()),
      rest_paid_amount = coalesce(round(p_amount, 2), greatest(coalesce(b.booking_value, b.quoted_price, b.estimate, 0) - coalesce(b.deposit_amount, 0), 0))
    where id = b.id;
  else
    update public.bookings set rest_paid_at = null, rest_paid_amount = null where id = b.id;
  end if;
end $$;

-- The chef's own bookkeeping, so their session may call it; the function checks it is theirs.

/** What the chef is owed and by whom, booking by booking and in total. */
create function public.chef_money_summary(p_chef uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if p_chef is distinct from public.my_chef_id() and not public.is_admin() then raise exception 'not_allowed'; end if;
  select jsonb_build_object(
    -- Signals clients have actually paid through the app, this year.
    'depositsReceived', coalesce((select sum(deposit_amount) from public.bookings
       where chef_id = p_chef and deposit_status = 'paid' and date_part('year', coalesce(deposit_paid_at, created_at)) = date_part('year', now())), 0),
    'commissionPaid', coalesce((select sum(commission_amount) from public.bookings
       where chef_id = p_chef and deposit_status = 'paid' and date_part('year', coalesce(deposit_paid_at, created_at)) = date_part('year', now())), 0),
    -- What the clients still owe the chef directly, on bookings that are going ahead.
    'restOwed', coalesce((select sum(greatest(coalesce(booking_value, quoted_price, estimate, 0) - coalesce(deposit_amount, 0), 0))
       from public.bookings
       where chef_id = p_chef and status in ('confirmed', 'completed') and rest_paid_at is null), 0),
    'restPaid', coalesce((select sum(rest_paid_amount) from public.bookings
       where chef_id = p_chef and rest_paid_at is not null
         and date_part('year', rest_paid_at) = date_part('year', now())), 0),
    'awaitingDeposit', coalesce((select count(*) from public.bookings
       where chef_id = p_chef and deposit_status in ('due', 'pending', 'overdue')), 0),
    'restToConfirm', coalesce((select count(*) from public.bookings
       where chef_id = p_chef and status in ('confirmed', 'completed') and rest_paid_at is null
         and coalesce(booking_value, quoted_price, estimate, 0) > coalesce(deposit_amount, 0)), 0)
  ) into v;
  return v;
end $$;
