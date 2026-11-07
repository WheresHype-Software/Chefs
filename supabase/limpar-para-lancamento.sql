-- ============================================================================
-- Ao Lume · limpar os dados de teste antes de abrir ao público
-- ============================================================================
--
-- ⚠️  IRREVERSÍVEL. Apaga TODAS as reservas, pagamentos, documentos, conversas e
--     clientes, e todos os chefs e contas excepto os que ficam abaixo. Não há
--     como distinguir teste de verdadeiro: se já houver uma reserva real, pára.
--
-- Fica: o chef Ivo Pacheco, a chef Joana Serafim Candeias, e a administração.
--
-- Os ficheiros saem à parte, com `node scripts/limpar-storage.mjs --apagar`, e
-- esse corre ANTES deste: o Supabase recusa DELETE directo em storage.objects, e
-- depois de apagar os perfis já não se sabe de quem era cada pasta.
--
-- Está tudo dentro de um bloco só, e não em `begin; ... commit;`, porque o editor
-- do Supabase fecha a transacção entre instruções: uma tabela temporária criada
-- no início já não existia a meio. Um bloco plpgsql é indivisível por natureza —
-- se alguma coisa falhar, nada disto aconteceu, incluindo as protecções que caem
-- no princípio e voltam no fim.

do $$
declare
  keep_chef uuid[];
  keep_profile uuid[];
  n int;
begin
  -- ------------------------------------------------------------ quem fica --
  select array_agg(id) into keep_chef
    from public.chefs where slug in ('ivo-pacheco', 'joana-serafim-candeias');

  if coalesce(array_length(keep_chef, 1), 0) <> 2 then
    raise exception 'esperava 2 chefs para manter, encontrei % — confirma os slugs',
      coalesce(array_length(keep_chef, 1), 0);
  end if;

  select array_agg(id) into keep_profile from (
    select id from public.profiles where role = 'admin'
    union
    select profile_id from public.chefs where id = any(keep_chef) and profile_id is not null
  ) t;

  -- --------------------------------------------------- 1. baixar as protecções --
  drop trigger if exists payment_events_append_only on public.payment_events;
  drop trigger if exists ledger_entries_append_only on public.ledger_entries;
  drop trigger if exists payouts_no_delete on public.payouts;
  drop trigger if exists payments_no_delete on public.payments;
  drop trigger if exists payout_documents_guard on public.payout_documents;
  drop trigger if exists chef_agreements_append_only on public.chef_agreements;

  -- ------------------------------------------------------------- 2. o dinheiro --
  delete from public.payout_documents;
  delete from public.ledger_entries;
  update public.payouts set batch_id = null;
  delete from public.payout_batches;
  delete from public.payouts;
  delete from public.refunds;
  delete from public.payment_events;
  delete from public.payments;

  -- --------------------------------- 3. reservas e tudo o que lhes pende --
  -- booking_events e reviews caem por cascata com as reservas.
  delete from public.bookings;
  delete from public.reports;
  delete from public.messages;
  delete from public.conversations;
  delete from public.guest_tokens;
  delete from public.guest_lookup_attempts;
  delete from public.clients;

  -- Apoio escrito durante os testes. Comenta estas duas linhas se houver alguma
  -- mensagem que queiras guardar.
  delete from public.support_messages;
  delete from public.support_tickets;

  -- -------------------------------------------- 4. os chefs que não ficam --
  -- Ofertas, fotografias, disponibilidade, dados fiscais e contratos caem por cascata.
  delete from public.chefs where id <> all(keep_chef);

  -- ----------------------------------------------------------- 5. contas --
  -- Apagar o utilizador em auth leva o perfil atrás por cascata.
  delete from auth.users where id <> all(keep_profile);

  -- ----------------------------- 6. contadores e numeração a zero --
  update public.chefs set completed_bookings = 0, rating_avg = null, review_count = 0;
  alter sequence public.payout_batch_seq restart with 1;
  alter sequence public.payout_document_seq restart with 1;

  -- ---------------------------------------------- 7. repor as protecções --
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
  create trigger chef_agreements_append_only before update or delete on public.chef_agreements
    for each row execute function public.refuse_write();

  -- E confirmar que ficaram todas no sítio antes de dar isto por feito.
  select count(*) into n from pg_trigger
   where tgname in ('payment_events_append_only', 'ledger_entries_append_only',
                    'payouts_no_delete', 'payments_no_delete',
                    'payout_documents_guard', 'chef_agreements_append_only')
     and not tgisinternal;
  if n <> 6 then
    raise exception 'faltam protecções (% de 6) — nada foi apagado', n;
  end if;
end $$;

-- ------------------------------------------------------------ o que ficou --
select 'chefs' as o_que, count(*) from public.chefs
union all select 'contas', count(*) from public.profiles
union all select 'reservas', count(*) from public.bookings
union all select 'pagamentos', count(*) from public.payments
union all select 'documentos', count(*) from public.payout_documents
union all select 'clientes', count(*) from public.clients;
