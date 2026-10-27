-- Ao Lume: guests find their booking again with the booking number and their email.

-- Failed lookups, to stop guessing. Only the security-definer function below touches it.
create table public.guest_lookup_attempts (
  id bigserial primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index guest_lookup_attempts_key_idx on public.guest_lookup_attempts (key, created_at);
alter table public.guest_lookup_attempts enable row level security;

-- Returns { bookingId, token } with a fresh guest token when the number and email match the same
-- booking, null when they do not. Five failures per email or per booking number per hour, then
-- 'too_many_attempts'. Booking numbers are sequential, so the email is what makes this safe.
create function public.find_guest_booking(p_ref text, p_email text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ref text := upper(trim(p_ref));
  v_email text := lower(trim(p_email));
  v_key_email text := 'email:' || public.hash_token(lower(trim(p_email)));
  v_key_ref text := 'ref:' || upper(trim(p_ref));
  b record;
begin
  if coalesce(v_ref, '') = '' or coalesce(v_email, '') = '' then return null; end if;
  delete from public.guest_lookup_attempts where created_at < now() - interval '1 day';
  if (select count(*) from public.guest_lookup_attempts where key = v_key_email and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.guest_lookup_attempts where key = v_key_ref and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_attempts';
  end if;

  select bk.id, bk.client_id into b
  from public.bookings bk join public.clients c on c.id = bk.client_id
  where bk.ref = v_ref and lower(c.email) = v_email;

  if not found then
    insert into public.guest_lookup_attempts (key) values (v_key_email), (v_key_ref);
    return null;
  end if;
  return jsonb_build_object('bookingId', b.id, 'token', public.new_guest_token(b.client_id));
end $$;

grant execute on function public.find_guest_booking(text, text) to anon, authenticated;
