-- Ao Lume: asking us something
--
-- Once money goes through the platform, "reply to the email" stops being enough: a person whose
-- signal did not arrive needs somewhere to write that is not a chef's inbox, and the team needs
-- the booking reference next to the message. Nothing here is clever — a form, a thread, and an
-- inbox — but it is the difference between a complaint that gets answered and one that becomes a
-- chargeback.

create type public.ticket_status as enum ('open', 'answered', 'closed');

create sequence public.support_ref_seq start 1;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('AP-' || to_char(now(), 'MMDD') || '-' || lpad(nextval('public.support_ref_seq')::text, 4, '0')),
  -- Set when the person was signed in; a guest writes with their email only.
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  category text not null check (category in ('reserva', 'pagamento', 'conta', 'chef', 'outro')),
  booking_ref text,
  subject text not null,
  body text not null,
  status public.ticket_status not null default 'open',
  assigned_to uuid references public.profiles (id) on delete set null,
  -- Kept for rate limiting and abuse, not for analytics.
  ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_status_idx on public.support_tickets (status, created_at desc);
create index support_tickets_email_idx on public.support_tickets (email, created_at desc);

create trigger support_tickets_touch before update on public.support_tickets
  for each row execute function public.touch_updated_at();

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author text not null check (author in ('person', 'team')),
  body text not null check (length(body) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- Writing in
-- ---------------------------------------------------------------------------
/**
 * The public form. Anyone may call it, so it validates everything and limits itself: five
 * messages an hour from one address, ten from one network. The limit is in the database rather
 * than in the app because the app runs in more than one place.
 */
create function public.create_support_ticket(
  p_name text,
  p_email text,
  p_phone text,
  p_category text,
  p_subject text,
  p_body text,
  p_booking_ref text default null,
  p_ip text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
  v_ref text;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  if length(trim(coalesce(p_subject, ''))) < 3 then raise exception 'subject_required'; end if;
  if length(trim(coalesce(p_body, ''))) < 10 then raise exception 'body_required'; end if;
  if p_category not in ('reserva', 'pagamento', 'conta', 'chef', 'outro') then raise exception 'invalid_category'; end if;

  if (select count(*) from public.support_tickets where email = v_email and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_requests';
  end if;
  if p_ip is not null
     and (select count(*) from public.support_tickets where ip = p_ip and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_requests';
  end if;

  insert into public.support_tickets (profile_id, name, email, phone, category, booking_ref, subject, body, ip)
  values (auth.uid(), left(trim(p_name), 120), v_email, nullif(left(trim(coalesce(p_phone, '')), 30), ''),
          p_category, nullif(left(trim(coalesce(p_booking_ref, '')), 40), ''),
          left(trim(p_subject), 200), left(trim(p_body), 8000), left(coalesce(p_ip, ''), 60))
  returning id, ref into v_id, v_ref;

  insert into public.support_messages (ticket_id, author, body) values (v_id, 'person', left(trim(p_body), 8000));
  return jsonb_build_object('id', v_id, 'ref', v_ref);
end $$;

/** The team's reply. Admin only; the email itself is sent by the server. */
create function public.reply_to_ticket(p_ticket uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_allowed'; end if;
  if length(trim(coalesce(p_body, ''))) = 0 then raise exception 'body_required'; end if;
  insert into public.support_messages (ticket_id, author, body) values (p_ticket, 'team', left(trim(p_body), 8000));
  update public.support_tickets set status = 'answered' where id = p_ticket and status = 'open';
end $$;

create function public.set_ticket_status(p_ticket uuid, p_status public.ticket_status) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_allowed'; end if;
  update public.support_tickets set status = p_status where id = p_ticket;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- A signed-in person sees their own threads; everyone else works through the function above.
create policy support_tickets_own on public.support_tickets for select
  using (profile_id = auth.uid() or public.is_admin());
create policy support_tickets_admin on public.support_tickets for all
  using (public.is_admin()) with check (public.is_admin());

create policy support_messages_own on public.support_messages for select using (
  public.is_admin() or exists (
    select 1 from public.support_tickets t where t.id = ticket_id and t.profile_id = auth.uid()
  )
);
create policy support_messages_admin on public.support_messages for all
  using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete on public.support_tickets, public.support_messages from anon, authenticated;
