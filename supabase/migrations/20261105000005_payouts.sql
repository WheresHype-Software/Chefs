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
end $;

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
