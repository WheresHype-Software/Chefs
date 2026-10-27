-- Ao Lume: search by date. chefs_near gains p_date so results only show chefs free that day.

drop function if exists public.chefs_near(double precision, double precision, public.service_type, text, int);

create function public.chefs_near(
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
      -- Free on the requested day: not blocked, and either open that day or not using the calendar.
      and (p_date is null or (
        not exists (select 1 from public.availability x where x.chef_id = c.id and x.date = p_date and x.status = 'blocked')
        and (
          not exists (select 1 from public.availability x where x.chef_id = c.id)
          or exists (select 1 from public.availability x where x.chef_id = c.id and x.date = p_date and x.status = 'available')
        )
      ))
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
