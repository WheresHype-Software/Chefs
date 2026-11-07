-- A retenção do IBAN passa a ser uma definição, e deixa de castigar quem ainda não tem IBAN.
--
-- Havia 72 horas fixas no código, somadas às horas de retenção do pagamento. Um chef que crie a
-- conta, preencha a faturação e faça o primeiro jantar no mesmo dia apanhava as duas esperas de
-- uma vez, logo no pagamento em que mais precisa de ver que a plataforma paga.
--
-- A retenção existe contra quem toma conta de uma conta alheia e aponta o IBAN a si próprio: dá
-- dias ao chef para ver o email da alteração e reclamar. Quando não havia IBAN nenhum, não há
-- nada para desviar, e a espera só protege contra o próprio chef. Fica à escolha, desligada.
alter table public.platform_settings
  add column if not exists iban_hold_hours int not null default 72 check (iban_hold_hours between 0 and 2160),
  add column if not exists iban_hold_first_time boolean not null default false;

comment on column public.platform_settings.iban_hold_hours is
  'Horas em que os pagamentos ficam retidos depois de o chef confirmar uma alteração de IBAN.';
comment on column public.platform_settings.iban_hold_first_time is
  'Aplicar essa retenção também ao primeiro IBAN, quando não havia nenhum para desviar.';

create or replace function public.confirm_iban_change(p_token_hash text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_chef uuid := public.my_chef_id();
  cb public.chef_billing;
  s public.platform_settings := public.settings();
  v_first boolean;
  v_hold timestamptz;
begin
  if v_chef is null then raise exception 'no_chef'; end if;
  select * into cb from public.chef_billing where chef_id = v_chef for update;
  if not found or cb.iban_pending_token_hash is null then raise exception 'no_pending_change'; end if;
  if cb.iban_pending_expires_at < now() then raise exception 'link_expired'; end if;
  if cb.iban_pending_token_hash <> p_token_hash then raise exception 'invalid_token'; end if;

  -- Primeiro IBAN da conta: não há conta anterior de onde desviar dinheiro.
  v_first := cb.iban_encrypted is null;
  v_hold := case
    when s.iban_hold_hours <= 0 then null
    when v_first and not s.iban_hold_first_time then null
    else now() + make_interval(hours => s.iban_hold_hours)
  end;

  update public.chef_billing set
    iban_encrypted = cb.iban_pending_encrypted,
    iban_last4 = cb.iban_pending_last4,
    iban_holder = coalesce(cb.iban_pending_holder, cb.iban_holder),
    iban_bic = cb.iban_pending_bic,
    iban_changed_at = now(),
    -- A verificação pela equipa continua a ser pedida: é outra proteção, e é ela que olha para
    -- o nome do titular. O que muda aqui é só a espera automática.
    iban_approved_at = null,
    iban_approved_by = null,
    payout_hold_until = v_hold,
    iban_pending_encrypted = null,
    iban_pending_last4 = null,
    iban_pending_holder = null,
    iban_pending_bic = null,
    iban_pending_token_hash = null,
    iban_pending_requested_at = null,
    iban_pending_expires_at = null
  where chef_id = v_chef;
  return cb.iban_pending_last4;
end $$;
