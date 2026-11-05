-- Ao Lume: apagar os dados de teste dos pagamentos
--
-- ⚠️  CORRE ISTO SÓ ANTES DO LANÇAMENTO, E SÓ UMA VEZ. Apaga TODOS os pagamentos, lançamentos,
-- devoluções, lotes e documentos da base de dados onde for corrido. Não distingue teste de real,
-- porque não há como distinguir: se já houver um pagamento verdadeiro, não corras isto.
--
-- Porque é que isto precisa de um guião próprio: as tabelas de dinheiro recusam DELETE a toda a
-- gente, inclusive à service_role. É de propósito — é o que garante que um histórico de dinheiro
-- não é reescrito a partir da aplicação. Apagar exige vir aqui, de propósito, com acesso direto à
-- base de dados, e repor as protecções a seguir. Está tudo numa transacção: se alguma coisa
-- falhar, as protecções voltam e nada é apagado.
--
-- O que NÃO apaga: os dados fiscais dos chefs (chef_billing) nem os contratos aceites
-- (chef_agreements) — esses são verdadeiros mesmo que tenham sido escritos durante os testes.
-- Há um bloco comentado no fim, se os quiseres mesmo apagar.

begin;

-- 1. Desligar as protecções de append-only.
drop trigger if exists payment_events_append_only on public.payment_events;
drop trigger if exists ledger_entries_append_only on public.ledger_entries;
drop trigger if exists payouts_no_delete on public.payouts;
drop trigger if exists payments_no_delete on public.payments;
drop trigger if exists payout_documents_guard on public.payout_documents;

-- 2. Apagar, pela ordem que as chaves estrangeiras permitem.
delete from public.payout_documents;
delete from public.ledger_entries;
update public.payouts set batch_id = null;
delete from public.payout_batches;
delete from public.payouts;
delete from public.refunds;
delete from public.payment_events;
delete from public.payments;

-- 3. Os ficheiros dos documentos e dos lotes, no armazenamento privado.
delete from storage.objects where bucket_id = 'payout-docs';

-- 4. Limpar o dinheiro congelado nas reservas. O estado da reserva fica como está: uma reserva
--    que ficou confirmada durante os testes continua confirmada, e isso é um facto, não um número.
update public.bookings set
  booking_value = null,
  deposit_amount = null,
  commission_amount = null,
  payout_amount = null,
  commission_percent_snapshot = null,
  money_frozen_at = null,
  money_capped = false,
  deposit_status = 'not_required',
  deposit_due_at = null,
  deposit_paid_at = null,
  payout_due_at = null
where money_frozen_at is not null or deposit_status <> 'not_required';

-- 5. Recomeçar a numeração, para que o primeiro documento verdadeiro seja o número 1.
alter sequence public.payout_batch_seq restart with 1;
alter sequence public.payout_document_seq restart with 1;

-- 6. Repor as protecções. Sem este passo a base de dados fica sem elas — é por isto que tudo
--    corre numa transacção.
create trigger payment_events_append_only before update or delete on public.payment_events
  for each row execute function public.refuse_write();
create trigger ledger_entries_append_only before update or delete on public.ledger_entries
  for each row execute function public.refuse_write();
create trigger payouts_no_delete before delete on public.payouts
  for each row execute function public.refuse_write();
create trigger payments_no_delete before delete on public.payments
  for each row execute function public.refuse_write();
create trigger payout_documents_guard before update or delete on public.payout_documents
  for each row execute function public.payout_documents_guard();

-- 7. Confirmar que ficaram todas no sítio antes de fechar.
do $$
declare n int;
begin
  select count(*) into n from pg_trigger
   where tgname in ('payment_events_append_only', 'ledger_entries_append_only',
                    'payouts_no_delete', 'payments_no_delete', 'payout_documents_guard')
     and not tgisinternal;
  if n <> 5 then
    raise exception 'faltam protecções (% de 5) — a transacção vai ser revertida', n;
  end if;
end $$;

commit;

-- Opcional, se também quiseres apagar os dados fiscais e os contratos escritos durante os testes.
-- Corre à parte e só se tiveres a certeza: um contrato aceite é prova, e um IBAN verificado
-- poupa ao chef ter de o indicar outra vez.
--
-- begin;
--   drop trigger if exists chef_agreements_append_only on public.chef_agreements;
--   delete from public.chef_agreements;
--   delete from public.chef_billing;
--   create trigger chef_agreements_append_only before update or delete on public.chef_agreements
--     for each row execute function public.refuse_write();
-- commit;
