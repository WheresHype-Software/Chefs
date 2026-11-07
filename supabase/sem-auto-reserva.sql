-- Ao Lume: um chef deixa de poder reservar a si próprio.
begin;

-- Ao Lume: um chef não reserva a si próprio
--
-- O request_booking liga o registo de cliente ao auth.uid() de quem está com sessão iniciada. Um
-- chef que reserve a sua própria oferta fica a ser, ao mesmo tempo, o chef e o cliente daquela
-- reserva — e o booking_actor devolve 'chef', por isso o ecrã de pagamento nunca aparece.
--
-- Mas o problema maior não é esse: seriam reservas, conclusões e avaliações à medida.

create or replace function public.request_booking(
  p_offer_id uuid,
  p_date date,
  p_time text,
  p_guests int,
  p_name text,
  p_email text,
  p_phone text,
  p_address text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  o public.offers;
  c public.chefs;
  v_client uuid;
  v_conv uuid;
  v_booking uuid;
  v_ref text;
  v_token text;
  v_point extensions.geography;
  v_distance numeric;
  v_radius numeric;
  v_email text := lower(trim(p_email));
  v_estimate numeric;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  if coalesce(trim(p_phone), '') = '' then raise exception 'phone_required'; end if;

  select * into o from public.offers where id = p_offer_id and active;
  if not found then raise exception 'offer_not_found'; end if;
  select * into c from public.chefs where id = o.chef_id and status = 'approved';
  if not found then raise exception 'chef_not_available'; end if;

  -- A chef reserving from themselves would be free bookings, free completions and free reviews.
  -- It also quietly binds their own client record to their account, which is how a test booking
  -- ends up being shown as the chef's own and never offering a way to pay.
  if c.profile_id is not null and c.profile_id = auth.uid() then
    raise exception 'cannot_book_own_offer';
  end if;

  if p_guests < o.min_guests or (o.max_guests is not null and p_guests > o.max_guests) then
    raise exception 'guests_out_of_range';
  end if;
  if p_date::timestamp < now() + make_interval(hours => o.lead_time_hours) - interval '1 day' then
    raise exception 'too_late_for_this_date';
  end if;
  if exists (select 1 from public.availability where chef_id = c.id)
     and not exists (select 1 from public.availability where chef_id = c.id and date = p_date and status = 'available')
  then
    raise exception 'date_not_available';
  end if;
  if exists (select 1 from public.availability where chef_id = c.id and date = p_date and status = 'blocked') then
    raise exception 'date_not_available';
  end if;

  if o.fulfilment_mode in ('home', 'delivery') then
    if coalesce(trim(p_address), '') = '' then raise exception 'address_required'; end if;
    if p_lat is not null and p_lng is not null and c.base_location is not null then
      v_point := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
      v_distance := round((extensions.st_distance(c.base_location, v_point) / 1000)::numeric, 1);
      select coalesce(case when o.fulfilment_mode = 'home' then l.travel_radius_km end, c.service_radius_km)
        into v_radius from public.chefs ch left join public.chef_logistics l on l.chef_id = ch.id where ch.id = c.id;
      if v_distance > v_radius then raise exception 'outside_service_area'; end if;
    end if;
  end if;

  -- Basic abuse guard: 5 requests per email per hour.
  if (select count(*) from public.bookings b join public.clients cl on cl.id = b.client_id
      where cl.email = v_email and b.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too_many_requests';
  end if;

  insert into public.clients (email, phone, name, profile_id)
  values (v_email, trim(p_phone), nullif(trim(p_name), ''), auth.uid())
  on conflict (email) do update set
    phone = coalesce(public.clients.phone, excluded.phone),
    name = coalesce(public.clients.name, excluded.name),
    profile_id = coalesce(public.clients.profile_id, excluded.profile_id)
  returning id into v_client;

  insert into public.conversations (chef_id, client_id) values (c.id, v_client)
  on conflict (chef_id, client_id) do update set last_message_at = now()
  returning id into v_conv;

  v_estimate := case when o.price_model = 'quote' then null else o.price * p_guests end;

  insert into public.bookings (
    chef_id, client_id, offer_id, offer_title, fulfilment_mode, date, time_label, guests,
    address, location, distance_km, notes, estimate
  ) values (
    c.id, v_client, o.id, o.title, o.fulfilment_mode, p_date, p_time, p_guests,
    case when o.fulfilment_mode = 'pickup' then null else trim(p_address) end,
    v_point, v_distance, nullif(trim(p_notes), ''), v_estimate
  ) returning id, ref into v_booking, v_ref;

  insert into public.booking_events (booking_id, to_status, actor) values (v_booking, 'requested', 'client');
  insert into public.messages (conversation_id, sender, body)
    values (v_conv, 'system', 'Pedido enviado · ' || o.title || ' · ' || to_char(p_date, 'DD/MM/YYYY'));
  if nullif(trim(p_notes), '') is not null then
    insert into public.messages (conversation_id, sender, body) values (v_conv, 'client', trim(p_notes));
  end if;

  v_token := public.new_guest_token(v_client);
  return jsonb_build_object('bookingId', v_booking, 'ref', v_ref, 'token', v_token, 'chefName', c.display_name);
end $$;

commit;
