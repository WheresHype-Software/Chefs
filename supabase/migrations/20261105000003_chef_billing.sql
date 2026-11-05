-- Ao Lume: the chef's fiscal identity, bank details and contract
--
-- Three jobs:
--   1. Hold what the law needs: legal name, NIF, fiscal address, and — because the platform now
--      intermediates the money — the DAC7 data the AT must be told once a year.
--   2. Hold the IBAN in a way that survives a database leak: the number arrives already encrypted
--      by the application, and even the chef's own session cannot read that column back.
--   3. Record the contract that makes the payment documents valid: which version, when, from where.
--
-- The dangerous operation here is not reading data, it is *changing the IBAN*. That is the one
-- move an attacker who gets into a chef's account would make, so it takes a confirmation link,
-- warns the address that is being replaced, and freezes payouts for three days afterwards.

create table public.chef_billing (
  chef_id uuid primary key references public.chefs (id) on delete cascade,

  -- Who the chef is, fiscally
  entity_type text not null default 'individual' check (entity_type in ('individual', 'company')),
  legal_name text,
  nif text check (nif is null or nif ~ '^\d{9}$'),
  vat_regime text not null default 'isento_art53' check (vat_regime in ('normal', 'isento_art53')),
  address_line text,
  postal_code text check (postal_code is null or postal_code ~ '^\d{4}-\d{3}$'),
  city text,
  country text not null default 'PT' check (country ~ '^[A-Z]{2}$'),

  -- DAC7 (DL 20/2022): what has to be reported about a seller on a platform.
  birth_date date,
  birth_place text,
  company_reg_number text,

  -- Where the money goes. iban_encrypted is AES-256-GCM from the application; the key is not in
  -- this database, so a dump of this table is a dump of nothing useful.
  iban_encrypted text,
  iban_last4 text,
  iban_holder text,
  iban_bic text,
  iban_changed_at timestamptz,
  -- A brand new IBAN needs a human to look at it before the first transfer leaves.
  iban_approved_at timestamptz,
  iban_approved_by uuid references public.profiles (id),

  -- A change waits here until the chef clicks the link in their email.
  iban_pending_encrypted text,
  iban_pending_last4 text,
  iban_pending_holder text,
  iban_pending_bic text,
  iban_pending_token_hash text,
  iban_pending_requested_at timestamptz,
  iban_pending_expires_at timestamptz,

  -- Set when the IBAN changes: nothing is transferred while this is in the future.
  payout_hold_until timestamptz,

  -- Founders and special arrangements, decided by an admin.
  commission_percent_override numeric(5, 2) check (commission_percent_override is null or commission_percent_override between 0 and 100),

  verified_at timestamptz,
  verified_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger chef_billing_touch before update on public.chef_billing
  for each row execute function public.touch_updated_at();

-- The contract that lets us collect the signal in the chef's name, keep the commission and issue
-- the payment documents without signing each one. Versioned: new text, new acceptance.
create table public.chef_agreements (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  version int not null,
  -- SHA-256 of the exact text shown on screen, so we can prove what was agreed to.
  body_sha256 text not null,
  accepted_at timestamptz not null default now(),
  ip text,
  user_agent text,
  revoked_at timestamptz,
  unique (chef_id, version)
);

create index chef_agreements_chef_idx on public.chef_agreements (chef_id, version desc);

-- An acceptance is a fact, not a record to tidy up later.
create trigger chef_agreements_append_only before update or delete on public.chef_agreements
  for each row execute function public.refuse_write();

-- ---------------------------------------------------------------------------
-- Writing: only through these functions, only for your own chef
-- ---------------------------------------------------------------------------
create function public.save_chef_billing(
  p_entity_type text,
  p_legal_name text,
  p_nif text,
  p_vat_regime text,
  p_address_line text,
  p_postal_code text,
  p_city text,
  p_country text default 'PT',
  p_birth_date date default null,
  p_birth_place text default null,
  p_company_reg_number text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_chef uuid := public.my_chef_id();
begin
  if v_chef is null then raise exception 'no_chef'; end if;

  insert into public.chef_billing as cb (
    chef_id, entity_type, legal_name, nif, vat_regime, address_line, postal_code, city, country,
    birth_date, birth_place, company_reg_number
  ) values (
    v_chef, p_entity_type, nullif(trim(p_legal_name), ''), nullif(regexp_replace(coalesce(p_nif, ''), '\D', '', 'g'), ''),
    p_vat_regime, nullif(trim(p_address_line), ''), nullif(trim(p_postal_code), ''), nullif(trim(p_city), ''),
    upper(coalesce(p_country, 'PT')), p_birth_date, nullif(trim(p_birth_place), ''), nullif(trim(p_company_reg_number), '')
  )
  on conflict (chef_id) do update set
    entity_type = excluded.entity_type,
    legal_name = excluded.legal_name,
    nif = excluded.nif,
    vat_regime = excluded.vat_regime,
    address_line = excluded.address_line,
    postal_code = excluded.postal_code,
    city = excluded.city,
    country = excluded.country,
    birth_date = excluded.birth_date,
    birth_place = excluded.birth_place,
    company_reg_number = excluded.company_reg_number,
    -- Fiscal data changing means the admin should look again before the next transfer.
    verified_at = case when cb.nif is distinct from excluded.nif then null else cb.verified_at end;
end $$;

/**
 * Step one of an IBAN change: park it. The application has already encrypted the number and
 * hashed the one-time token that goes out by email. Nothing is transferred to a parked IBAN.
 */
create function public.start_iban_change(
  p_encrypted text, p_last4 text, p_holder text, p_bic text, p_token_hash text, p_minutes int default 60
) returns void
language plpgsql security definer set search_path = public as $$
declare v_chef uuid := public.my_chef_id();
begin
  if v_chef is null then raise exception 'no_chef'; end if;
  if coalesce(trim(p_encrypted), '') = '' or coalesce(trim(p_token_hash), '') = '' then raise exception 'invalid_input'; end if;

  insert into public.chef_billing (chef_id, iban_pending_encrypted, iban_pending_last4, iban_pending_holder,
    iban_pending_bic, iban_pending_token_hash, iban_pending_requested_at, iban_pending_expires_at)
  values (v_chef, p_encrypted, p_last4, nullif(trim(p_holder), ''), nullif(trim(p_bic), ''), p_token_hash,
    now(), now() + make_interval(mins => greatest(p_minutes, 5)))
  on conflict (chef_id) do update set
    iban_pending_encrypted = excluded.iban_pending_encrypted,
    iban_pending_last4 = excluded.iban_pending_last4,
    iban_pending_holder = excluded.iban_pending_holder,
    iban_pending_bic = excluded.iban_pending_bic,
    iban_pending_token_hash = excluded.iban_pending_token_hash,
    iban_pending_requested_at = excluded.iban_pending_requested_at,
    iban_pending_expires_at = excluded.iban_pending_expires_at;
end $$;

/**
 * Step two: the chef clicked the link. The parked IBAN becomes the real one, payouts freeze for
 * three days, and the first transfer to it waits for an admin. Returns the last four digits.
 */
create function public.confirm_iban_change(p_token_hash text) returns text
language plpgsql security definer set search_path = public as $$
declare v_chef uuid := public.my_chef_id(); cb public.chef_billing;
begin
  if v_chef is null then raise exception 'no_chef'; end if;
  select * into cb from public.chef_billing where chef_id = v_chef for update;
  if not found or cb.iban_pending_token_hash is null then raise exception 'no_pending_change'; end if;
  if cb.iban_pending_expires_at < now() then raise exception 'link_expired'; end if;
  if cb.iban_pending_token_hash <> p_token_hash then raise exception 'invalid_token'; end if;

  update public.chef_billing set
    iban_encrypted = cb.iban_pending_encrypted,
    iban_last4 = cb.iban_pending_last4,
    iban_holder = coalesce(cb.iban_pending_holder, cb.iban_holder),
    iban_bic = cb.iban_pending_bic,
    iban_changed_at = now(),
    iban_approved_at = null,
    iban_approved_by = null,
    payout_hold_until = now() + interval '72 hours',
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

create function public.accept_chef_agreement(p_version int, p_sha text, p_ip text, p_user_agent text) returns void
language plpgsql security definer set search_path = public as $$
declare v_chef uuid := public.my_chef_id();
begin
  if v_chef is null then raise exception 'no_chef'; end if;
  insert into public.chef_agreements (chef_id, version, body_sha256, ip, user_agent)
  values (v_chef, p_version, p_sha, left(coalesce(p_ip, ''), 60), left(coalesce(p_user_agent, ''), 400))
  on conflict (chef_id, version) do nothing;
end $$;

/**
 * Everything that has to be true before money may leave for a chef. Used by the payout batch and
 * shown to the chef as a checklist, so nobody has to guess why a transfer is waiting.
 */
create function public.chef_payout_readiness(p_chef uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $
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
    'agreementVersion', (select max(a.version) from public.chef_agreements a where a.chef_id = p_chef and a.revoked_at is null),
    'requiredAgreementVersion', (select agreement_version from public.platform_settings where id = 1),
    'blocked', coalesce(c.payouts_blocked, false),
    'blockedReason', c.payouts_blocked_reason
  )
  into v_result
  from public.chefs c
  left join public.chef_billing cb on cb.chef_id = c.id
  where c.id = p_chef;

  return v_result;
end $;

/** True only when every condition above is met. The batch builder calls this and nothing else. */
create function public.chef_can_be_paid(p_chef uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (r->>'hasFiscal')::boolean and (r->>'hasDac7')::boolean and (r->>'hasIban')::boolean
     and (r->>'ibanApproved')::boolean and not (r->>'onHold')::boolean and not (r->>'blocked')::boolean
     and coalesce((r->>'agreementVersion')::int, 0) >= (r->>'requiredAgreementVersion')::int
  from (select public.chef_payout_readiness(p_chef) as r) t;
$$;

-- ---------------------------------------------------------------------------
-- Row level security and column privileges
-- ---------------------------------------------------------------------------
alter table public.chef_billing enable row level security;
alter table public.chef_agreements enable row level security;

create policy chef_billing_owner_read on public.chef_billing for select using (chef_id = public.my_chef_id());
create policy chef_billing_admin on public.chef_billing for all using (public.is_admin()) with check (public.is_admin());

create policy chef_agreements_owner_read on public.chef_agreements for select using (chef_id = public.my_chef_id());
create policy chef_agreements_admin on public.chef_agreements for all using (public.is_admin()) with check (public.is_admin());

-- No session writes these tables directly: the functions above and the server hold the pen.
revoke insert, update, delete on public.chef_billing, public.chef_agreements from anon, authenticated;

-- And nobody reads the encrypted numbers back through the API, not even their owner. The chef
-- sees the last four digits; the plain IBAN is assembled once, server-side, to make a bank file.
revoke select (iban_encrypted, iban_pending_encrypted, iban_pending_token_hash)
  on public.chef_billing from anon, authenticated;
