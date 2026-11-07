-- Abrir o pagamento ao chef falhava ao concluir a reserva.
--
-- O `case when v_blocked then 'held' else 'due' end` tem dois literais, e nessa altura o Postgres
-- já decidiu que a expressão é `text`: deixa de ser `unknown` e perde a coerção automática para a
-- coluna. O insert morria com 42804 ("column status is of type payout_status but expression is of
-- type text"), o trigger rebentava, e o chef via "Não foi possível atualizar a reserva" sem nunca
-- conseguir marcar o serviço como concluído. Um `case` com um só ramo, como o `hold_reason` aqui
-- ao lado, continua `unknown` e por isso nunca deu problema.
--
-- O resto da função fica igual ao que estava em 20261105000002_payments_schema.sql.
create or replace function public.open_payout_for_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_blocked boolean;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;
  if new.deposit_status <> 'paid' or coalesce(new.payout_amount, 0) <= 0 then return new; end if;

  select payouts_blocked into v_blocked from public.chefs where id = new.chef_id;
  insert into public.payouts (chef_id, booking_id, amount, status, due_at, hold_reason)
  values (
    new.chef_id, new.id, new.payout_amount,
    (case when v_blocked then 'held' else 'due' end)::public.payout_status,
    coalesce(new.payout_due_at, now()),
    case when v_blocked then 'chef_payouts_blocked' end
  )
  on conflict (booking_id) where booking_id is not null do nothing;
  return new;
end $$;
