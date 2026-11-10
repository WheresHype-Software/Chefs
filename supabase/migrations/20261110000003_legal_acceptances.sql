-- Ao Lume: the legal texts people accept, and the record of each acceptance
--
-- Until now a chef's acceptance kept only the SHA-256 of the contract, and the words themselves
-- lived in the code. Proving what was agreed meant rebuilding the text from git, and the v1 text
-- had already changed once without a new version number. From here on:
--
--   1. Every text that anyone accepts is archived whole in legal_texts, keyed by its hash. A check
--      constraint recomputes the hash, so a row can never claim words it does not hold.
--   2. Every acceptance (terms and chef contract, at sign-up or later) is one row in
--      legal_acceptances, tied to the account, not to the chef profile: at sign-up there is no
--      chef yet. Who, which text, the exact checkbox wording, when, from which IP and browser, and
--      when the copy went out by email.
--   3. Both tables are written only by the server with the secret key. No session can insert,
--      and nobody can rewrite history: the only later changes allowed are stamping the email copy
--      once, revoking once, and the account link going null if the account is deleted.
--
-- chef_agreements stays as it was (append-only, nothing is lost) and its rows are copied here,
-- so payout readiness now reads one place.

-- ---------------------------------------------------------------------------
-- The texts
-- ---------------------------------------------------------------------------
create table public.legal_texts (
  sha256 text primary key check (sha256 ~ '^[0-9a-f]{64}$'),
  kind text not null check (kind in ('terms', 'chef_contract')),
  -- The contract's number ("3") or the terms' date ("10 de novembro de 2026").
  version text not null check (kind <> 'chef_contract' or version ~ '^\d+$'),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint legal_texts_hash_matches check (encode(extensions.digest(convert_to(body, 'UTF8'), 'sha256'), 'hex') = sha256)
);

create index legal_texts_kind_idx on public.legal_texts (kind, version);

create trigger legal_texts_append_only before update or delete on public.legal_texts
  for each row execute function public.refuse_write();

-- ---------------------------------------------------------------------------
-- The acceptances
-- ---------------------------------------------------------------------------
create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  -- Set null if the account is ever deleted: the record of what was agreed outlives the login.
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('terms', 'chef_contract')),
  version text not null check (kind <> 'chef_contract' or version ~ '^\d+$'),
  -- Not a foreign key on purpose: an old acceptance whose text could not be recovered is still a
  -- fact worth keeping. The certificate says plainly when the text is not in the archive.
  text_sha256 text not null check (text_sha256 ~ '^[0-9a-f]{64}$'),
  -- The exact sentence next to the checkbox.
  consent_text text not null,
  context text not null check (context in ('signup', 'onboarding', 'dashboard', 'billing', 'legacy')),
  -- Who the account was at that moment: emails and names change, the evidence should not.
  account_email text,
  account_name text,
  ip text,
  user_agent text,
  accepted_at timestamptz not null default now(),
  email_sent_at timestamptz,
  revoked_at timestamptz,
  unique (user_id, kind, text_sha256)
);

create index legal_acceptances_user_idx on public.legal_acceptances (user_id, kind, accepted_at desc);

/** Append-only, except for three one-way changes. */
create function public.legal_acceptances_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'legal_acceptances is append-only';
  end if;
  if (to_jsonb(new) - 'email_sent_at' - 'revoked_at' - 'user_id') <> (to_jsonb(old) - 'email_sent_at' - 'revoked_at' - 'user_id')
     or (old.email_sent_at is not null and new.email_sent_at is distinct from old.email_sent_at)
     or (old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at)
     or (new.user_id is not null and new.user_id is distinct from old.user_id) then
    raise exception 'legal_acceptances is append-only';
  end if;
  return new;
end $$;

create trigger legal_acceptances_guard before update or delete on public.legal_acceptances
  for each row execute function public.legal_acceptances_guard();

-- ---------------------------------------------------------------------------
-- Every contract text chefs could have accepted so far, rebuilt from git
-- ---------------------------------------------------------------------------
-- Two v1 texts exist: the second only swapped "— versão" for ", versão" in the title line, but a
-- hash is a hash. replace() drops carriage returns in case this file is pasted with CRLF; the
-- hashes were computed on the text with plain line feeds, as the app produces it.
insert into public.legal_texts (sha256, kind, version, title, body)
select sha256, kind, version, title, replace(body, E'\r', '')
from (values
  -- 13f9e7d
  ('0bc0e7b4a9e4f42b02ca9abbc1d4dcccef458b6f38c830cf653e0a3574ef2d2c', 'chef_contract', '1', 'Contrato de intermediação de pagamentos', $texto$Contrato de intermediação de pagamentos — versão 1

Entre Where's Hype Software, NIF 516834797, com sede em Vila Franca de Xira, Lisboa, que explora a plataforma Ao Lume
(adiante "Ao Lume"), e o profissional que aceita este contrato na sua conta (adiante "o chef").

1. Objeto
O Ao Lume liga clientes a chefs e cozinheiros. O serviço de restauração é prestado pelo chef ao cliente;
o Ao Lume não cozinha, não contrata o chef e não é parte no contrato de prestação de serviço.

2. Mandato para receber o sinal
O chef autoriza expressamente o Ao Lume a receber, em seu nome e por sua conta, o sinal pago pelo cliente
através da plataforma. O Ao Lume atua como mandatário do chef para esse efeito e apenas para esse efeito.
O restante preço do serviço é combinado e pago diretamente entre o cliente e o chef, fora da plataforma.

3. Comissão
O Ao Lume cobra uma comissão sobre o valor total da reserva, à taxa em vigor publicada no painel do chef
no momento em que o chef aceita cada pedido. O chef autoriza o Ao Lume a deduzir essa comissão ao sinal
recebido. O valor da comissão fica fixado no momento em que o chef aceita o pedido e não é alterado
depois disso, mesmo que a taxa mude entretanto.

4. Pagamento ao chef
Concluído o serviço e decorrido o prazo de retenção indicado no painel, o Ao Lume transfere ao chef o
sinal recebido deduzido da comissão, para o IBAN registado na conta do chef. O prazo de retenção existe
para que eventuais reclamações do cliente cheguem antes de o dinheiro sair.

5. Documento de pagamento
Com cada pagamento, o Ao Lume emite e envia ao chef um documento que identifica o chef (nome legal, NIF e
morada fiscal), a reserva, o valor do serviço, o sinal recebido, a comissão deduzida e o valor transferido.
O chef declara conhecer e aceitar o conteúdo destes documentos ao abrigo deste contrato, dispensando
assinatura documento a documento, e obriga-se a comunicar ao Ao Lume qualquer erro no prazo de 15 dias.
Este documento não é uma fatura e não dispensa as obrigações fiscais do chef perante o cliente nem a
emissão de fatura pelo chef quando devida.

6. Obrigações fiscais do chef
O chef declara ter atividade aberta junto da Autoridade Tributária, manter atualizados os seus dados
fiscais no painel e cumprir as suas obrigações de faturação e de IVA. A comissão do Ao Lume é faturada ao
chef nos termos da lei.

7. Cancelamentos e devoluções
As regras de cancelamento e de devolução do sinal são as publicadas na plataforma e as definidas pelo
chef na sua política de cancelamento. Quando o sinal é devolvido ao cliente por facto não imputável ao
chef, a comissão correspondente não é cobrada. Quando é o chef a cancelar depois de aceitar, o sinal é
integralmente devolvido ao cliente.

8. Dados pessoais
Os dados fiscais e bancários do chef são tratados para execução deste contrato e para cumprimento de
obrigações legais, conservados pelo prazo legal de dez anos, e não são usados para outro fim. O Ao Lume
está obrigado a comunicar anualmente à Autoridade Tributária os dados e os montantes previstos no
Decreto-Lei n.º 20/2022 (DAC7), e informa o chef do que foi comunicado. O chef pode exercer os seus
direitos em privacidade@aolume.com.

9. Alterações e vigência
Este contrato é válido por tempo indeterminado. Alterações à taxa de comissão ou a este texto são
comunicadas com pelo menos 30 dias de antecedência e exigem nova aceitação; até lá valem as condições
aceites. O chef pode cessar o contrato a qualquer momento, ficando o Ao Lume obrigado a pagar o que já
tiver recebido em seu nome.

10. Lei aplicável
Aplica-se a lei portuguesa. Para qualquer litígio é competente o foro da comarca de Lisboa, sem prejuízo
do recurso à resolução alternativa de litígios e ao Livro de Reclamações.

Contacto: apoio@aolume.com$texto$),
  -- 79feff9
  ('153efec8f2eb6c1ee59bb0f50bdedbdc5f04d2f2dcfd0b5e1977998c34eb4826', 'chef_contract', '1', 'Contrato de intermediação de pagamentos', $texto$Contrato de intermediação de pagamentos, versão 1

Entre Where's Hype Software, NIF 516834797, com sede em Vila Franca de Xira, Lisboa, que explora a plataforma Ao Lume
(adiante "Ao Lume"), e o profissional que aceita este contrato na sua conta (adiante "o chef").

1. Objeto
O Ao Lume liga clientes a chefs e cozinheiros. O serviço de restauração é prestado pelo chef ao cliente;
o Ao Lume não cozinha, não contrata o chef e não é parte no contrato de prestação de serviço.

2. Mandato para receber o sinal
O chef autoriza expressamente o Ao Lume a receber, em seu nome e por sua conta, o sinal pago pelo cliente
através da plataforma. O Ao Lume atua como mandatário do chef para esse efeito e apenas para esse efeito.
O restante preço do serviço é combinado e pago diretamente entre o cliente e o chef, fora da plataforma.

3. Comissão
O Ao Lume cobra uma comissão sobre o valor total da reserva, à taxa em vigor publicada no painel do chef
no momento em que o chef aceita cada pedido. O chef autoriza o Ao Lume a deduzir essa comissão ao sinal
recebido. O valor da comissão fica fixado no momento em que o chef aceita o pedido e não é alterado
depois disso, mesmo que a taxa mude entretanto.

4. Pagamento ao chef
Concluído o serviço e decorrido o prazo de retenção indicado no painel, o Ao Lume transfere ao chef o
sinal recebido deduzido da comissão, para o IBAN registado na conta do chef. O prazo de retenção existe
para que eventuais reclamações do cliente cheguem antes de o dinheiro sair.

5. Documento de pagamento
Com cada pagamento, o Ao Lume emite e envia ao chef um documento que identifica o chef (nome legal, NIF e
morada fiscal), a reserva, o valor do serviço, o sinal recebido, a comissão deduzida e o valor transferido.
O chef declara conhecer e aceitar o conteúdo destes documentos ao abrigo deste contrato, dispensando
assinatura documento a documento, e obriga-se a comunicar ao Ao Lume qualquer erro no prazo de 15 dias.
Este documento não é uma fatura e não dispensa as obrigações fiscais do chef perante o cliente nem a
emissão de fatura pelo chef quando devida.

6. Obrigações fiscais do chef
O chef declara ter atividade aberta junto da Autoridade Tributária, manter atualizados os seus dados
fiscais no painel e cumprir as suas obrigações de faturação e de IVA. A comissão do Ao Lume é faturada ao
chef nos termos da lei.

7. Cancelamentos e devoluções
As regras de cancelamento e de devolução do sinal são as publicadas na plataforma e as definidas pelo
chef na sua política de cancelamento. Quando o sinal é devolvido ao cliente por facto não imputável ao
chef, a comissão correspondente não é cobrada. Quando é o chef a cancelar depois de aceitar, o sinal é
integralmente devolvido ao cliente.

8. Dados pessoais
Os dados fiscais e bancários do chef são tratados para execução deste contrato e para cumprimento de
obrigações legais, conservados pelo prazo legal de dez anos, e não são usados para outro fim. O Ao Lume
está obrigado a comunicar anualmente à Autoridade Tributária os dados e os montantes previstos no
Decreto-Lei n.º 20/2022 (DAC7), e informa o chef do que foi comunicado. O chef pode exercer os seus
direitos em privacidade@aolume.com.

9. Alterações e vigência
Este contrato é válido por tempo indeterminado. Alterações à taxa de comissão ou a este texto são
comunicadas com pelo menos 30 dias de antecedência e exigem nova aceitação; até lá valem as condições
aceites. O chef pode cessar o contrato a qualquer momento, ficando o Ao Lume obrigado a pagar o que já
tiver recebido em seu nome.

10. Lei aplicável
Aplica-se a lei portuguesa. Para qualquer litígio é competente o foro da comarca de Lisboa, sem prejuízo
do recurso à resolução alternativa de litígios e ao Livro de Reclamações.

Contacto: apoio@aolume.com$texto$),
  -- 293835e
  ('28cb62527f8b1d8c58f5c495a40188b20a810467c4f4688039c3b078e0c126f7', 'chef_contract', '2', 'Contrato de intermediação de pagamentos', $texto$Contrato de intermediação de pagamentos, versão 2

Entre Where's Hype Software, NIF 516834797, com sede em Vila Franca de Xira, Lisboa, que explora a plataforma Ao Lume
(adiante "Ao Lume"), e o profissional que aceita este contrato na sua conta (adiante "o chef").

1. Objeto
O Ao Lume liga clientes a chefs e cozinheiros. O serviço de restauração é prestado pelo chef ao cliente;
o Ao Lume não cozinha, não contrata o chef e não é parte no contrato de prestação de serviço.

2. Mandato para receber o sinal
O chef autoriza expressamente o Ao Lume a receber, em seu nome e por sua conta, o sinal pago pelo cliente
através da plataforma. O Ao Lume atua como mandatário do chef para esse efeito e apenas para esse efeito.
O restante preço do serviço é combinado e pago diretamente entre o cliente e o chef, fora da plataforma.

3. Comissão
O Ao Lume cobra uma comissão sobre o valor total da reserva, à taxa em vigor publicada no painel do chef
no momento em que o chef aceita cada pedido. O chef autoriza o Ao Lume a deduzir essa comissão ao sinal
recebido. O valor da comissão fica fixado no momento em que o chef aceita o pedido e não é alterado
depois disso, mesmo que a taxa mude entretanto.

4. Pagamento ao chef
Concluído o serviço, o Ao Lume transfere ao chef o sinal recebido deduzido da comissão, para o IBAN
registado na conta do chef. Entre a conclusão do serviço e o pagamento existe um período de retenção,
para que eventuais reclamações do cliente cheguem antes de o dinheiro sair. Os pagamentos são feitos
periodicamente; o chef vê a qualquer momento, no seu painel, quanto tem a receber e em que estado está
cada valor.

5. Documento de pagamento
Com cada pagamento, o Ao Lume emite e envia ao chef um documento que identifica o chef (nome legal, NIF e
morada fiscal), a reserva, o valor do serviço, o sinal recebido, a comissão deduzida e o valor transferido.
O chef declara conhecer e aceitar o conteúdo destes documentos ao abrigo deste contrato, dispensando
assinatura documento a documento, e obriga-se a comunicar ao Ao Lume qualquer erro no prazo de 15 dias.
Este documento não é uma fatura e não dispensa as obrigações fiscais do chef perante o cliente nem a
emissão de fatura pelo chef quando devida.

6. Obrigações fiscais do chef
O chef declara ter atividade aberta junto da Autoridade Tributária, manter atualizados os seus dados
fiscais no painel e cumprir as suas obrigações de faturação e de IVA. A comissão do Ao Lume é faturada ao
chef nos termos da lei.

7. Cancelamentos e devoluções
As regras de cancelamento e de devolução do sinal são as publicadas na plataforma e as definidas pelo
chef na sua política de cancelamento. Quando o sinal é devolvido ao cliente por facto não imputável ao
chef, a comissão correspondente não é cobrada. Quando é o chef a cancelar depois de aceitar, o sinal é
integralmente devolvido ao cliente.

8. Dados pessoais
Os dados fiscais e bancários do chef são tratados para execução deste contrato e para cumprimento de
obrigações legais, conservados pelo prazo legal de dez anos, e não são usados para outro fim. O Ao Lume
está obrigado a comunicar anualmente à Autoridade Tributária os dados e os montantes previstos no
Decreto-Lei n.º 20/2022 (DAC7), e informa o chef do que foi comunicado. O chef pode exercer os seus
direitos em privacidade@aolume.com.

9. Alterações e vigência
Este contrato é válido por tempo indeterminado. Alterações à taxa de comissão ou a este texto são
comunicadas com pelo menos 30 dias de antecedência e exigem nova aceitação; até lá valem as condições
aceites. O chef pode cessar o contrato a qualquer momento, ficando o Ao Lume obrigado a pagar o que já
tiver recebido em seu nome.

10. Lei aplicável
Aplica-se a lei portuguesa. Para qualquer litígio é competente o foro da comarca de Lisboa, sem prejuízo
do recurso à resolução alternativa de litígios e ao Livro de Reclamações.

Contacto: apoio@aolume.com$texto$)
) as t (sha256, kind, version, title, body)
on conflict (sha256) do nothing;

-- ---------------------------------------------------------------------------
-- Copy the acceptances recorded so far
-- ---------------------------------------------------------------------------
-- The wording next to the checkbox never changed while chef_agreements was in use.
insert into public.legal_acceptances (user_id, kind, version, text_sha256, consent_text, context, ip, user_agent, accepted_at, revoked_at)
select c.profile_id, 'chef_contract', a.version::text, a.body_sha256,
       'Li e aceito o contrato de intermediação de pagamentos, incluindo a autorização para o Ao Lume receber o sinal em meu nome, descontar a comissão e emitir os documentos de pagamento com os meus dados fiscais.',
       'legacy', nullif(a.ip, ''), nullif(a.user_agent, ''), a.accepted_at, a.revoked_at
from public.chef_agreements a
join public.chefs c on c.id = a.chef_id
where c.profile_id is not null
on conflict (user_id, kind, text_sha256) do nothing;

-- The old write path goes: acceptances are now recorded by the server, for terms and contract alike.
drop function if exists public.accept_chef_agreement(int, text, text, text);

-- ---------------------------------------------------------------------------
-- Payout readiness reads the new table
-- ---------------------------------------------------------------------------
create or replace function public.chef_payout_readiness(p_chef uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb;
begin
  -- Security definer: without this check, any id would reveal another chef's standing.
  -- auth.uid() is null means the server with the secret key (the payout batch builder), not a visitor.
  if auth.uid() is not null and p_chef is distinct from public.my_chef_id() and not public.is_admin() then
    raise exception 'not_allowed';
  end if;

  select jsonb_build_object(
    'hasFiscal', cb.chef_id is not null and cb.legal_name is not null and cb.nif is not null
                 and cb.address_line is not null and cb.postal_code is not null and cb.city is not null,
    'hasDac7', cb.chef_id is not null and (
                 (cb.entity_type = 'individual' and cb.birth_date is not null and cb.birth_place is not null)
                 or (cb.entity_type = 'company' and cb.company_reg_number is not null)),
    'hasIban', cb.iban_encrypted is not null,
    'ibanApproved', cb.iban_approved_at is not null,
    'ibanPending', cb.iban_pending_token_hash is not null,
    'onHold', coalesce(cb.payout_hold_until > now(), false),
    'holdUntil', cb.payout_hold_until,
    'agreementVersion', (select max(la.version::int) from public.legal_acceptances la
                         where la.user_id = c.profile_id and la.kind = 'chef_contract' and la.revoked_at is null),
    'requiredAgreementVersion', (select agreement_version from public.platform_settings where id = 1),
    'blocked', coalesce(c.payouts_blocked, false),
    'blockedReason', c.payouts_blocked_reason
  )
  into v_result
  from public.chefs c
  left join public.chef_billing cb on cb.chef_id = c.id
  where c.id = p_chef;

  return v_result;
end $$;

-- Contract v3 adds the chef's responsibility for the food and the clause on electronic form and
-- proof. Payments are switched off, so requiring it now stops nothing; every chef is asked to
-- accept it in the dashboard.
update public.platform_settings set agreement_version = greatest(agreement_version, 3) where id = 1;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.legal_texts enable row level security;
alter table public.legal_acceptances enable row level security;

-- The texts are public anyway: the links in the emails open them without signing in.
create policy legal_texts_public_read on public.legal_texts for select using (true);

create policy legal_acceptances_owner_read on public.legal_acceptances for select using (user_id = auth.uid());
create policy legal_acceptances_admin_read on public.legal_acceptances for select using (public.is_admin());

revoke insert, update, delete on public.legal_texts, public.legal_acceptances from anon, authenticated;
