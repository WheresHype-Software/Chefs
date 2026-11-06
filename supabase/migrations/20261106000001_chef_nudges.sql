-- Ao Lume: ir buscar quem ficou a meio
--
-- Criar conta e desistir é o normal, não a exceção: a pessoa inscreve-se no telemóvel à noite,
-- não tem as fotografias à mão, fecha o separador e não volta. A lista de primeiros passos só
-- ajuda quem regressa por iniciativa própria — e quem não regressa não é lembrado por ninguém.
--
-- Três pontos onde se perde gente, e um email em cada um. Uma vez por etapa e por pessoa: isto é
-- um lembrete, não uma campanha.

create type public.nudge_stage as enum ('no_profile', 'draft_incomplete', 'draft_ready');

create table public.chef_nudges (
  id bigserial primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stage public.nudge_stage not null,
  sent_at timestamptz not null default now(),
  unique (profile_id, stage)
);

alter table public.chef_nudges enable row level security;
create policy chef_nudges_admin on public.chef_nudges for select using (public.is_admin());
revoke insert, update, delete on public.chef_nudges from anon, authenticated;

/**
 * Quem está parado e em que etapa, com o email para onde escrever.
 *
 * Só conta quem está parado há tempo suficiente para não estar simplesmente a meio de o fazer:
 * ninguém gosta de receber um lembrete de algo que abandonou há dez minutos.
 */
create function public.chefs_to_nudge(p_limit int default 50) returns table (
  profile_id uuid,
  email text,
  name text,
  stage public.nudge_stage,
  chef_name text,
  since timestamptz
)
language sql stable security definer set search_path = public as $$
  -- Criou conta de chef e nunca chegou a criar o perfil.
  select p.id, p.email, p.name, 'no_profile'::public.nudge_stage, null::text, p.created_at
    from public.profiles p
    left join public.chefs c on c.profile_id = p.id
   where p.role = 'chef' and c.id is null
     and p.created_at < now() - interval '24 hours'
     and p.email is not null
     and not exists (select 1 from public.chef_nudges n where n.profile_id = p.id and n.stage = 'no_profile')

  union all

  -- Tem perfil em rascunho, mas ainda sem o que o torna público.
  select p.id, p.email, p.name, 'draft_incomplete'::public.nudge_stage, c.display_name, c.updated_at
    from public.chefs c
    join public.profiles p on p.id = c.profile_id
   where c.status = 'draft'
     and c.updated_at < now() - interval '48 hours'
     and p.email is not null
     and (
       (select count(*) from public.chef_photos ph where ph.chef_id = c.id and ph.kind = 'gallery') < 3
       or not exists (select 1 from public.offers o where o.chef_id = c.id and o.active)
     )
     and not exists (select 1 from public.chef_nudges n where n.profile_id = p.id and n.stage = 'draft_incomplete')

  union all

  -- Tem tudo e só falta carregar no botão. É a mais fácil de recuperar.
  select p.id, p.email, p.name, 'draft_ready'::public.nudge_stage, c.display_name, c.updated_at
    from public.chefs c
    join public.profiles p on p.id = c.profile_id
   where c.status = 'draft'
     and c.updated_at < now() - interval '24 hours'
     and p.email is not null
     and (select count(*) from public.chef_photos ph where ph.chef_id = c.id and ph.kind = 'gallery') >= 3
     and exists (select 1 from public.offers o where o.chef_id = c.id and o.active)
     and not exists (select 1 from public.chef_nudges n where n.profile_id = p.id and n.stage = 'draft_ready')

  limit greatest(p_limit, 1);
$$;

create function public.record_chef_nudge(p_profile uuid, p_stage public.nudge_stage) returns void
language sql security definer set search_path = public as $$
  insert into public.chef_nudges (profile_id, stage) values (p_profile, p_stage)
  on conflict (profile_id, stage) do nothing;
$$;

-- Decidir a quem se escreve é trabalho do servidor, não de uma sessão de browser.
revoke execute on function public.chefs_to_nudge(int) from anon, authenticated;
revoke execute on function public.record_chef_nudge(uuid, public.nudge_stage) from anon, authenticated;
