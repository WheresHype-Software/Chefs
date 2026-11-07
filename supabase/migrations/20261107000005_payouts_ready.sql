-- Uma única definição de "pronto a pagar", para a interface e o lote dizerem o mesmo.
--
-- O botão contava `status = 'due'` e prometia "Criar lote com 1 pagamento", mas o
-- build_payout_batch também exige `due_at <= now()` e chef_can_be_paid(). Quem carregava levava
-- com "Não há nada pronto a pagar neste momento" sem perceber porquê. Duas listas escritas em
-- dois sítios acabam sempre assim; passa a haver uma, e o lote usa-a também.
create or replace function public.payouts_ready_now() returns setof uuid
language sql stable security definer set search_path = public as $$
  select p.id
    from public.payouts p
   where public.is_admin()
     and p.status = 'due'
     and p.due_at <= now()
     and p.amount <> 0
     and public.chef_can_be_paid(p.chef_id);
$$;

revoke execute on function public.payouts_ready_now() from anon;
grant execute on function public.payouts_ready_now() to authenticated;

create or replace function public.build_payout_batch(p_created_by uuid default null) returns uuid
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
