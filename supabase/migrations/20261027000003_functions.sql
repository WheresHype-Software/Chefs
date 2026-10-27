-- Ao Lume: public API functions, booking lifecycle, reviews, admin actions.
-- Guests never get table access: everything they do goes through these
-- security-definer functions, authorised by a hashed magic-link token.

-- ---------------------------------------------------------------------------
-- Helpers (internal, not callable by clients)
-- ---------------------------------------------------------------------------
create function public.hash_token(p_token text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

create function public.client_from_token(p_token text) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select client_id from public.guest_tokens
  where token_hash = public.hash_token(p_token) and expires_at > now();
$$;

create function public.new_guest_token(p_client_id uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare v_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  insert into public.guest_tokens (client_id, token_hash) values (p_client_id, public.hash_token(v_token));
  return v_token;
end $$;

-- Who is acting on a booking: the signed-in chef, the client (account or token), or nobody.
create function public.booking_actor(p_booking_id uuid, p_token text default null) returns text
language plpgsql stable security definer set search_path = public as $$
declare b record;
begin
  select chef_id, client_id into b from public.bookings where id = p_booking_id;
  if not found then return null; end if;
  if b.chef_id = public.my_chef_id() then return 'chef'; end if;
  if b.client_id = public.my_client_id() then return 'client'; end if;
  if p_token is not null and b.client_id = public.client_from_token(p_token) then return 'client'; end if;
  if public.is_admin() then return 'admin'; end if;
  return null;
end $$;

create function public.post_system_message(p_booking_id uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare v_conv uuid;
begin
  select c.id into v_conv from public.conversations c
    join public.bookings b on b.chef_id = c.chef_id and b.client_id = c.client_id
    where b.id = p_booking_id;
  if v_conv is not null then
    insert into public.messages (conversation_id, sender, body) values (v_conv, 'system', p_body);
    update public.conversations set last_message_at = now() where id = v_conv;
  end if;
end $$;

-- A chef's base location is public (it drives the map), so it is snapped to ~100 m.
-- The exact kitchen address lives only in chef_logistics, which is private.
create function public.snap_chef_location() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  if new.base_location is not null then
    new.base_location := extensions.st_setsrid(extensions.st_makepoint(
      round(extensions.st_x(new.base_location::extensions.geometry)::numeric, 3),
      round(extensions.st_y(new.base_location::extensions.geometry)::numeric, 3)
    ), 4326)::extensions.geography;
  end if;
  return new;
end $$;

create trigger chefs_snap_location before insert or update of base_location on public.chefs
  for each row execute function public.snap_chef_location();

-- Computed columns so the API can select chefs.lat / chefs.lng.
create function public.lat(c public.chefs) returns double precision
language sql stable set search_path = public, extensions as $$
  select extensions.st_y(c.base_location::extensions.geometry);
$$;

create function public.lng(c public.chefs) returns double precision
language sql stable set search_path = public, extensions as $$
  select extensions.st_x(c.base_location::extensions.geometry);
$$;

-- ---------------------------------------------------------------------------
-- Discovery
-- ---------------------------------------------------------------------------
-- Chefs whose service area covers the given point (or all approved chefs when no point).
-- Locations are rounded to ~300 m so a chef's home is never exposed.
create function public.chefs_near(
  p_lat double precision default null,
  p_lng double precision default null,
  p_service public.service_type default null,
  p_category text default null,
  p_limit int default 100
) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  with pt as (
    select case when p_lat is null or p_lng is null then null
      else extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography end as g
  ),
  base as (
    select c.*,
      case when pt.g is null or c.base_location is null then null
        else round((extensions.st_distance(c.base_location, pt.g) / 1000)::numeric, 1) end as distance_km
    from public.chefs c, pt
    where c.status = 'approved'
      and (
        pt.g is null
        or extensions.st_dwithin(c.base_location, pt.g, c.service_radius_km * 1000)
        or exists (
          select 1 from public.chef_service_areas a
          where a.chef_id = c.id and a.type = 'radius'
            and extensions.st_dwithin(a.center, pt.g, a.radius_km * 1000)
        )
      )
      and (p_service is null or exists (select 1 from public.chef_services s where s.chef_id = c.id and s.service = p_service))
      and (p_category is null or exists (
        select 1 from public.chef_categories cc join public.cuisine_categories k on k.id = cc.category_id
        where cc.chef_id = c.id and (k.slug = p_category or k.name_pt = p_category)
      ))
  )
  select coalesce(jsonb_agg(card order by promoted desc, rank_score desc), '[]'::jsonb)
  from (
    select
      b.is_promoted and coalesce(b.promoted_until > now(), true) as promoted,
      coalesce(b.rating_avg, 4.5) * ln(2 + b.review_count) - coalesce(b.distance_km, 0) * 0.05 as rank_score,
      jsonb_build_object(
        'id', b.id,
        'slug', b.slug,
        'name', b.display_name,
        'tier', b.tier,
        'headline', b.headline,
        'bio', b.bio,
        'area', b.area_name,
        'lat', round(extensions.st_y(b.base_location::extensions.geometry)::numeric, 3),
        'lng', round(extensions.st_x(b.base_location::extensions.geometry)::numeric, 3),
        'radiusKm', b.service_radius_km,
        'distanceKm', b.distance_km,
        'rating', b.rating_avg,
        'reviewCount', b.review_count,
        'responseHours', b.response_time_hours,
        'badges', b.badges,
        'isNew', b.approved_at > now() - interval '30 days',
        'promoted', b.is_promoted and coalesce(b.promoted_until > now(), true),
        'categories', coalesce((
          select jsonb_agg(k.name_pt order by k.sort_order) from public.chef_categories cc
          join public.cuisine_categories k on k.id = cc.category_id where cc.chef_id = b.id), '[]'),
        'services', coalesce((select jsonb_agg(s.service) from public.chef_services s where s.chef_id = b.id), '[]'),
        'cover', (select p.url from public.chef_photos p where p.chef_id = b.id and p.kind in ('cover', 'gallery') order by p.kind = 'cover' desc, p.sort_order limit 1),
        'offers', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', o.id, 'title', o.title, 'description', o.description, 'mode', o.fulfilment_mode,
            'priceModel', o.price_model, 'price', o.price, 'unit', o.unit_label,
            'minGuests', o.min_guests, 'maxGuests', o.max_guests, 'leadHours', o.lead_time_hours,
            'timeSlots', o.time_slots
          ) order by o.sort_order, o.created_at)
          from public.offers o where o.chef_id = b.id and o.active), '[]')
      ) as card
    from base b
    order by 1 desc, 2 desc
    limit p_limit
  ) ranked;
$$;

-- Available and taken dates for a chef in a window (no booking details are exposed).
create function public.chef_calendar(p_chef_id uuid, p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'available', coalesce((
      select jsonb_agg(distinct a.date order by a.date) from public.availability a
      where a.chef_id = p_chef_id and a.status = 'available' and a.date between p_from and p_to
        and not exists (select 1 from public.availability x where x.chef_id = a.chef_id and x.date = a.date and x.status = 'blocked')
    ), '[]'),
    'booked', coalesce((
      select jsonb_agg(distinct b.date order by b.date) from public.bookings b
      where b.chef_id = p_chef_id and b.status in ('accepted', 'confirmed') and b.date between p_from and p_to
    ), '[]')
  )
  where public.chef_is_public(p_chef_id) or p_chef_id = public.my_chef_id();
$$;

-- ---------------------------------------------------------------------------
-- Booking request (guest or signed-in client)
-- ---------------------------------------------------------------------------
create function public.request_booking(
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

-- ---------------------------------------------------------------------------
-- Booking view (client by token or account, or the chef)
-- ---------------------------------------------------------------------------
create function public.booking_view(p_booking_id uuid, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_actor text := public.booking_actor(p_booking_id, p_token);
  b public.bookings;
  v_conv uuid;
begin
  if v_actor is null then raise exception 'not_allowed'; end if;
  select * into b from public.bookings where id = p_booking_id;
  select id into v_conv from public.conversations where chef_id = b.chef_id and client_id = b.client_id;

  return jsonb_build_object(
    'viewer', v_actor,
    'booking', to_jsonb(b) - 'location',
    'chef', (select jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'name', c.display_name, 'area', c.area_name,
        'responseHours', c.response_time_hours, 'paymentMethods', c.payment_methods, 'depositPercent', c.deposit_percent)
      from public.chefs c where c.id = b.chef_id),
    'client', (select jsonb_build_object('name', cl.name, 'email', cl.email, 'phone', cl.phone)
      from public.clients cl where cl.id = b.client_id),
    'policy', (select jsonb_build_object('preset', p.preset, 'text', p.custom_text)
      from public.cancellation_policies p where p.chef_id = b.chef_id),
    -- The kitchen address is revealed only once a pickup is accepted.
    'pickupAddress', case when b.fulfilment_mode = 'pickup' and b.status in ('accepted', 'confirmed', 'completed')
      then (select l.kitchen_address from public.chef_logistics l where l.chef_id = b.chef_id) end,
    'events', coalesce((select jsonb_agg(jsonb_build_object('to', e.to_status, 'at', e.created_at) order by e.created_at)
      from public.booking_events e where e.booking_id = b.id), '[]'),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'sender', m.sender, 'body', m.body, 'at', m.created_at) order by m.created_at)
      from public.messages m where m.conversation_id = v_conv), '[]'),
    'review', (select to_jsonb(r) from public.reviews r where r.booking_id = b.id)
  );
end $$;

create function public.client_post_message(p_booking_id uuid, p_body text, p_token text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_conv uuid;
begin
  if public.booking_actor(p_booking_id, p_token) is distinct from 'client' then raise exception 'not_allowed'; end if;
  if length(trim(p_body)) = 0 then return; end if;
  select c.id into v_conv from public.conversations c
    join public.bookings b on b.chef_id = c.chef_id and b.client_id = c.client_id where b.id = p_booking_id;
  insert into public.messages (conversation_id, sender, body) values (v_conv, 'client', left(trim(p_body), 4000));
  update public.conversations set last_message_at = now() where id = v_conv;
end $$;

-- Client actions on their booking: cancel, or accept the chef's proposed date/quote.
create function public.client_update_booking(p_booking_id uuid, p_action text, p_token text default null) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  if public.booking_actor(p_booking_id, p_token) is distinct from 'client' then raise exception 'not_allowed'; end if;
  select * into b from public.bookings where id = p_booking_id for update;
  perform set_config('app.actor', 'client', true);
  if p_action = 'cancel' then
    if b.status not in ('requested', 'accepted', 'change_proposed', 'confirmed') then raise exception 'cannot_cancel'; end if;
    update public.bookings set status = 'cancelled', cancelled_by = 'client' where id = b.id;
  elsif p_action = 'accept_proposal' then
    if b.status <> 'change_proposed' then raise exception 'no_proposal'; end if;
    update public.bookings set
      status = 'accepted',
      date = coalesce(b.proposed_date, b.date),
      time_label = coalesce(b.proposed_time, b.time_label),
      estimate = coalesce(b.quoted_price, b.estimate)
    where id = b.id;
  else
    raise exception 'unknown_action';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Booking lifecycle guard
-- Requested -> Accepted | Declined | Change proposed -> Confirmed -> Completed
-- Either side can cancel before completion.
-- ---------------------------------------------------------------------------
create function public.booking_status_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor text := coalesce(nullif(current_setting('app.actor', true), ''),
                           case when old.chef_id = public.my_chef_id() then 'chef'
                                when public.is_admin() then 'admin' else 'system' end);
  ok boolean;
  v_chef_name text;
begin
  -- Chefs may only change workflow fields, never who/what was booked.
  if v_actor = 'chef' and (
    new.client_id <> old.client_id or new.chef_id <> old.chef_id or new.offer_id is distinct from old.offer_id
    or new.guests <> old.guests or new.address is distinct from old.address
  ) then
    raise exception 'field_change_not_allowed';
  end if;

  if new.status = old.status then return new; end if;

  ok := case
    when v_actor in ('system', 'admin') then true
    when v_actor = 'chef' then
      (old.status = 'requested' and new.status in ('accepted', 'declined', 'change_proposed', 'cancelled'))
      or (old.status = 'change_proposed' and new.status in ('declined', 'cancelled'))
      or (old.status = 'accepted' and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('completed', 'cancelled'))
    when v_actor = 'client' then
      (old.status in ('requested', 'accepted', 'change_proposed', 'confirmed') and new.status = 'cancelled')
      or (old.status = 'change_proposed' and new.status = 'accepted')
    else false
  end;
  if not ok then
    raise exception 'invalid_transition: % -> % by %', old.status, new.status, v_actor;
  end if;

  if new.status = 'accepted' then
    new.accepted_at := now();
    if new.fulfilment_mode = 'pickup' and new.pickup_code is null then
      new.pickup_code := lpad((floor(random() * 10000))::int::text, 4, '0');
    end if;
  elsif new.status = 'confirmed' then
    new.confirmed_at := now();
  elsif new.status = 'completed' then
    new.completed_at := now();
  elsif new.status = 'cancelled' and new.cancelled_by is null then
    new.cancelled_by := v_actor;
  end if;

  insert into public.booking_events (booking_id, from_status, to_status, actor)
  values (new.id, old.status, new.status, v_actor);

  select split_part(display_name, ' ', 1) into v_chef_name from public.chefs where id = new.chef_id;
  perform public.post_system_message(new.id, case new.status
    when 'accepted' then v_chef_name || ' aceitou o pedido'
    when 'declined' then v_chef_name || ' recusou o pedido' || coalesce(' · ' || new.decline_reason, '')
    when 'change_proposed' then v_chef_name || ' propôs ' || coalesce(to_char(new.proposed_date, 'DD/MM'), 'outra data')
      || coalesce(' · ' || new.proposed_time, '') || coalesce(' · ' || new.quoted_price || ' €', '')
    when 'confirmed' then 'Reserva confirmada'
    when 'completed' then 'Reserva concluída · já pode avaliar'
    when 'cancelled' then 'Reserva cancelada'
    when 'expired' then 'O pedido expirou sem resposta'
    else new.status::text end);

  if new.status = 'completed' then
    perform set_config('app.internal', 'on', true);
    update public.chefs set completed_bookings = completed_bookings + 1 where id = new.chef_id;
    perform set_config('app.internal', 'off', true);
  end if;
  return new;
end $$;

create trigger bookings_status_guard before update on public.bookings
  for each row execute function public.booking_status_guard();

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create function public.submit_review(
  p_booking_id uuid,
  p_food int, p_presentation int, p_punctuality int, p_communication int, p_value int,
  p_comment text default null,
  p_photos text[] default '{}',
  p_allow_showcase boolean default false,
  p_token text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare b public.bookings; v_id uuid; v_name text;
begin
  if public.booking_actor(p_booking_id, p_token) is distinct from 'client' then raise exception 'not_allowed'; end if;
  select * into b from public.bookings where id = p_booking_id;
  if b.status <> 'completed' then raise exception 'booking_not_completed'; end if;
  if b.completed_at < now() - interval '14 days' then raise exception 'review_window_closed'; end if;
  select coalesce(split_part(name, ' ', 1) || ' ' || left(split_part(name, ' ', 2), 1) || '.', 'Cliente')
    into v_name from public.clients where id = b.client_id;

  insert into public.reviews (booking_id, chef_id, client_id, author_name, food, presentation, punctuality,
    communication, value, comment, photos, allow_showcase)
  values (b.id, b.chef_id, b.client_id, trim(v_name), p_food, p_presentation, p_punctuality,
    p_communication, p_value, nullif(trim(p_comment), ''), coalesce(p_photos, '{}'), p_allow_showcase)
  returning id into v_id;

  update public.bookings set show_in_showcase = p_allow_showcase where id = b.id;
  return v_id;
end $$;

create function public.reply_to_review(p_review_id uuid, p_reply text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.reviews set chef_reply = left(trim(p_reply), 2000), chef_replied_at = now()
  where id = p_review_id and chef_id = public.my_chef_id() and chef_reply is null;
  if not found then raise exception 'cannot_reply'; end if;
end $$;

create function public.refresh_chef_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_chef uuid := coalesce(new.chef_id, old.chef_id);
begin
  perform set_config('app.internal', 'on', true);
  update public.chefs set
    rating_avg = (select round(avg(overall), 2) from public.reviews where chef_id = v_chef and status = 'visible'),
    review_count = (select count(*) from public.reviews where chef_id = v_chef and status = 'visible')
  where id = v_chef;
  perform set_config('app.internal', 'off', true);
  return null;
end $$;

create trigger reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_chef_rating();

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
create function public.admin_review_chef(
  p_chef_id uuid, p_status public.chef_status, p_note text default null, p_badges text[] default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_allowed'; end if;
  update public.chefs set
    status = p_status,
    verification_notes = coalesce(p_note, verification_notes),
    badges = coalesce(p_badges, badges),
    approved_at = case when p_status = 'approved' and approved_at is null then now() else approved_at end
  where id = p_chef_id;
  insert into public.admin_logs (admin_id, action, target, details)
  values (auth.uid(), 'chef_' || p_status, p_chef_id::text, jsonb_build_object('note', p_note, 'badges', p_badges));
end $$;

-- ---------------------------------------------------------------------------
-- Scheduled jobs (called by pg_cron, see the cron migration)
-- ---------------------------------------------------------------------------
create function public.expire_stale_requests() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform set_config('app.actor', 'system', true);
  update public.bookings set status = 'expired'
  where status in ('requested', 'change_proposed') and created_at < now() - interval '48 hours';
  get diagnostics n = row_count;
  return n;
end $$;

create function public.auto_complete_bookings() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform set_config('app.actor', 'system', true);
  update public.bookings set status = 'completed'
  where status = 'confirmed' and date < (now() - interval '24 hours')::date;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Grants: internal helpers stay private.
-- ---------------------------------------------------------------------------
revoke execute on function public.client_from_token(text) from public, anon, authenticated;
revoke execute on function public.new_guest_token(uuid) from public, anon, authenticated;
revoke execute on function public.post_system_message(uuid, text) from public, anon, authenticated;
revoke execute on function public.expire_stale_requests() from public, anon, authenticated;
revoke execute on function public.auto_complete_bookings() from public, anon, authenticated;
revoke execute on function public.booking_actor(uuid, text) from public, anon, authenticated;

-- Realtime for chat and booking status.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.bookings;
