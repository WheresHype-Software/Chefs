-- Ao Lume: days a chef is open every week, so the calendar isn't redone month after month.
--
-- Before, every open day was its own row in availability, and the shortcut only filled the month
-- on screen: a chef who cooks every Friday had to come back each month, and a forgotten month
-- quietly took them out of search. Now chefs.open_weekdays holds the days that are open every
-- week (0 = Sunday ... 6 = Saturday, as extract(dow) and JS getDay()), and availability rows are
-- the exceptions: 'available' opens one extra day, 'blocked' closes one day (holidays, a day off).
--
-- chef_open_on() is the one rule, used by search, the booking request and the public calendar.
-- A chef who has never set any day stays as before: open to requests every day in search and
-- booking, with an empty public calendar.

alter table public.chefs
  add column if not exists open_weekdays smallint[] not null default '{}'
  check (open_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]);

comment on column public.chefs.open_weekdays is
  'Weekdays open every week (0 = Sunday ... 6 = Saturday). Availability rows are exceptions to it.';

-- Open for requests on this date: not closed that day, and open that day, open that weekday,
-- or not using the calendar at all.
create or replace function public.chef_open_on(p_chef uuid, p_date date) returns boolean
language sql stable security definer set search_path = public as $$
  select
    not exists (select 1 from public.availability x where x.chef_id = p_chef and x.date = p_date and x.status = 'blocked')
    and (
      exists (select 1 from public.availability x where x.chef_id = p_chef and x.date = p_date and x.status = 'available')
      or exists (select 1 from public.chefs c where c.id = p_chef and extract(dow from p_date)::smallint = any (c.open_weekdays))
      or (
        not exists (select 1 from public.availability x where x.chef_id = p_chef)
        and exists (select 1 from public.chefs c where c.id = p_chef and cardinality(c.open_weekdays) = 0)
      )
    );
$$;

-- Free and booked days for the public calendar. As before, only days the chef actually opened
-- (now including their weekly days) count as free; a chef not using the calendar shows none.
create or replace function public.chef_calendar(p_chef_id uuid, p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'available', coalesce((
      select jsonb_agg(d::date order by d)
      from generate_series(greatest(p_from, current_date)::timestamp, least(p_to, p_from + 400)::timestamp, interval '1 day') d
      -- Past days are never free, now that a weekday rule would otherwise reach back into them.
      where not exists (
          select 1 from public.availability x where x.chef_id = p_chef_id and x.date = d::date and x.status = 'blocked'
        )
        and (
          exists (select 1 from public.availability x where x.chef_id = p_chef_id and x.date = d::date and x.status = 'available')
          or exists (
            select 1 from public.chefs c where c.id = p_chef_id and extract(dow from d)::smallint = any (c.open_weekdays)
          )
        )
    ), '[]'),
    'booked', coalesce((
      select jsonb_agg(distinct b.date order by b.date) from public.bookings b
      where b.chef_id = p_chef_id and b.status in ('accepted', 'confirmed') and b.date between p_from and p_to
    ), '[]')
  )
  where public.chef_is_public(p_chef_id) or p_chef_id = public.my_chef_id();
$$;

-- Search: as before, with the day check going through chef_open_on.
create or replace function public.chefs_near(
  p_lat double precision default null,
  p_lng double precision default null,
  p_service public.service_type default null,
  p_category text default null,
  p_date date default null,
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
      -- Free on the requested day (chef_open_on: weekly days, extra days, days off).
      and (p_date is null or public.chef_open_on(c.id, p_date))
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

-- Booking request: as before, with the day check going through chef_open_on.
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
  v_profile uuid;
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
  if not public.chef_open_on(c.id, p_date) then
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

  -- auth.uid(), mas só se ainda não pertencer a outro email: profile_id é único.
  v_profile := auth.uid();
  if v_profile is not null
     and exists (select 1 from public.clients where profile_id = v_profile and email <> v_email) then
    v_profile := null;
  end if;

  insert into public.clients (email, phone, name, profile_id)
  values (v_email, trim(p_phone), nullif(trim(p_name), ''), v_profile)
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
