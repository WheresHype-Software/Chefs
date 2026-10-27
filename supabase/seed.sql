-- Ao Lume: lookup data and demo chefs (Lisbon). Safe to run on a fresh database.

insert into public.cuisine_categories (slug, name_pt, name_en, sort_order) values
  ('portuguesa', 'Portuguesa', 'Portuguese', 1),
  ('petiscos', 'Petiscos', 'Small plates', 2),
  ('marisco-peixe', 'Marisco e peixe', 'Seafood and fish', 3),
  ('grelhados', 'Grelhados', 'Grill', 4),
  ('autor', 'Cozinha de autor', 'Chef''s cuisine', 5),
  ('mediterranica', 'Mediterrânica', 'Mediterranean', 6),
  ('vegetariana', 'Vegetariana', 'Vegetarian', 7),
  ('vegan', 'Vegan', 'Vegan', 8),
  ('saudavel', 'Saudável', 'Healthy', 9),
  ('pastelaria', 'Pastelaria', 'Pastry', 10),
  ('brasileira', 'Brasileira', 'Brazilian', 11),
  ('asiatica', 'Asiática', 'Asian', 12)
on conflict (slug) do nothing;

insert into public.diets (slug, name_pt, name_en) values
  ('vegetariano', 'Vegetariano', 'Vegetarian'),
  ('vegan', 'Vegan', 'Vegan'),
  ('sem-gluten', 'Sem glúten', 'Gluten-free'),
  ('sem-lactose', 'Sem lactose', 'Lactose-free'),
  ('halal', 'Halal', 'Halal'),
  ('criancas', 'Para crianças', 'For children')
on conflict (slug) do nothing;

-- Demo chefs. Delete before launch: they have no auth account (profile_id is null).
with demo (slug, name, tier, area, lat, lng, radius, response, headline, bio, cats, svcs, years) as (values
  ('marta-figueiredo', 'Marta Figueiredo', 'professional', 'Campo de Ourique', 38.7167, -9.1667, 15, 3,
   'Portuguesa contemporânea',
   'Receitas de família do Minho com técnica de restaurante. Faço as compras, sirvo à mesa e deixo a cozinha arrumada.',
   array['portuguesa', 'marisco-peixe'], array['home', 'events']::public.service_type[], 12),
  ('rui-barata', 'Rui Barata', 'professional', 'Estrela', 38.7128, -9.1600, 20, 6,
   'Grelhados no carvão',
   'Levo a grelha a carvão e trato de tudo no terraço ou no jardim. Petiscos para partilhar e peixe do dia.',
   array['grelhados', 'petiscos'], array['home', 'events']::public.service_type[], 9),
  ('ines-cordeiro', 'Inês Cordeiro', 'home', 'Alvalade', 38.7530, -9.1430, 8, 2,
   'Marmitas semanais',
   'Cozinho ao domingo para a sua semana: sopa, prato e fruta. Opção vegetariana todas as semanas.',
   array['saudavel', 'portuguesa'], array['meal_prep', 'delivery', 'pickup']::public.service_type[], 4),
  ('joana-lopes', 'Joana Lopes', 'home', 'Benfica', 38.7510, -9.2000, 10, 4,
   'Pastelaria caseira',
   'Bolos de aniversário, tartes e pastéis de nata feitos na hora. Encomendas com três dias de antecedência.',
   array['pastelaria'], array['delivery', 'pickup']::public.service_type[], 2),
  ('tiago-mendes', 'Tiago Mendes', 'professional', 'Belém', 38.6975, -9.2060, 30, 1,
   'Cozinha de autor',
   'Menu de degustação com produto da época, vinhos portugueses e serviço de sala.',
   array['autor', 'marisco-peixe'], array['home', 'events']::public.service_type[], 15),
  ('carla-nunes', 'Carla Nunes', 'home', 'Alfama', 38.7115, -9.1300, 15, 5,
   'Petiscos e eventos',
   'Petiscos de Lisboa para festas em casa: pastéis de bacalhau, bifanas, salada de polvo.',
   array['petiscos', 'portuguesa'], array['events', 'home', 'delivery', 'pickup']::public.service_type[], 6),
  ('andre-sousa', 'André Sousa', 'professional', 'Avenidas Novas', 38.7370, -9.1480, 12, 2,
   'Cozinha vegetal',
   'Cozinha vegetal com sabor português. Marmitas semanais ou jantares em casa, sem carne nem peixe.',
   array['vegetariana', 'vegan'], array['meal_prep', 'home', 'delivery']::public.service_type[], 7)
),
ins as (
  insert into public.chefs (slug, display_name, tier, area_name, base_location, service_radius_km,
    response_time_hours, headline, bio, status, approved_at, years_experience, badges, deposit_percent)
  select slug, name, tier::public.chef_tier, area,
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography,
    radius, response, headline, bio, 'approved', now() - interval '60 days', years,
    array['identity', 'portfolio'], 30
  from demo
  on conflict (slug) do nothing
  returning id, slug
),
cats as (
  insert into public.chef_categories (chef_id, category_id)
  select ins.id, k.id from ins join demo on demo.slug = ins.slug
  cross join lateral unnest(demo.cats) as c(slug)
  join public.cuisine_categories k on k.slug = c.slug
  returning 1
)
insert into public.chef_services (chef_id, service)
select ins.id, s from ins join demo on demo.slug = ins.slug cross join lateral unnest(demo.svcs) as s;

-- Offers
insert into public.offers (chef_id, title, description, fulfilment_mode, service_types, price_model, price, unit_label, min_guests, max_guests, time_slots, sort_order)
select c.id, o.title, o.descr, o.mode::public.fulfilment_mode, o.svc::public.service_type[], o.model::public.price_model, o.price, o.unit, o.min_g, o.max_g, o.slots, o.ord
from (values
  ('marta-figueiredo', 'Jantar do Minho', 'Caldo verde com broa · Bacalhau confitado com grão · Arroz de pato · Pudim abade de Priscos', 'home', '{home}', 'per_person', 55, 'pessoa', 2, 20, '{13:00,19:30,20:00,20:30}'::text[], 1),
  ('marta-figueiredo', 'Mariscada à mesa', 'Ameijoas à Bulhão Pato · Camarão ao alho · Arroz de marisco · Sericaia', 'home', '{home}', 'per_person', 72, 'pessoa', 2, 12, '{13:00,19:30,20:00,20:30}', 2),
  ('rui-barata', 'Grelhada no terraço', 'Petiscos e prato principal na grelha a carvão', 'home', '{home}', 'per_person', 48, 'pessoa', 4, 20, '{13:00,19:00,20:00}', 1),
  ('rui-barata', 'Festa de grupo', '10 a 30 pessoas, menu à medida', 'home', '{events}', 'quote', null, 'evento', 10, 30, '{13:00,19:00,20:00}', 2),
  ('ines-cordeiro', 'Semana completa', 'Sopa e prato · entrega à segunda', 'delivery', '{meal_prep,delivery}', 'per_person', 11, 'refeição', 5, 20, '{"Entrega 18:00–20:00"}', 1),
  ('ines-cordeiro', 'Só sopas', 'Cinco sopas de meio litro', 'pickup', '{meal_prep,pickup}', 'per_person', 4, 'sopa', 5, 20, '{"Levantar 12:00"}', 2),
  ('joana-lopes', 'Bolo de aniversário', 'Doze fatias, decoração à escolha', 'delivery', '{delivery}', 'fixed', 32, 'bolo', 1, 3, '{Entrega}', 1),
  ('joana-lopes', 'Pastéis de nata', 'Caixa de doze, para levantar', 'pickup', '{pickup}', 'fixed', 18, 'caixa', 1, 10, '{"Levantar 10:00","Levantar 17:00"}', 2),
  ('tiago-mendes', 'Degustação de outono', 'Sete momentos', 'home', '{home}', 'per_person', 75, 'pessoa', 4, 12, '{13:00,20:00}', 1),
  ('tiago-mendes', 'Com harmonização', 'Sete momentos e quatro vinhos', 'home', '{home}', 'per_person', 98, 'pessoa', 4, 12, '{13:00,20:00}', 2),
  ('carla-nunes', 'Mesa de petiscos', 'Oito petiscos, entrega e montagem', 'delivery', '{events,delivery}', 'per_person', 22, 'pessoa', 8, 40, '{12:30,19:00,20:00}', 1),
  ('carla-nunes', 'Chef em casa', 'Três tempos tradicionais', 'home', '{home}', 'per_person', 40, 'pessoa', 2, 12, '{12:30,19:00,20:00}', 2),
  ('andre-sousa', 'Marmitas vegetais', 'Cinco dias · entrega ao domingo', 'delivery', '{meal_prep,delivery}', 'per_person', 12, 'refeição', 5, 20, '{"Entrega 18:00–20:00"}', 1),
  ('andre-sousa', 'Jantar vegetal em casa', 'Quatro tempos', 'home', '{home}', 'per_person', 50, 'pessoa', 2, 10, '{20:00}', 2)
) as o(slug, title, descr, mode, svc, model, price, unit, min_g, max_g, slots, ord)
join public.chefs c on c.slug = o.slug
where not exists (select 1 from public.offers x where x.chef_id = c.id and x.title = o.title);

-- Availability: every chef gets their weekday pattern for the next 60 days.
insert into public.availability (chef_id, date, status)
select c.id, d::date, 'available'
from public.chefs c
cross join generate_series(current_date + 2, current_date + 60, interval '1 day') d
where c.profile_id is null
  and (
    (c.slug in ('marta-figueiredo', 'rui-barata', 'tiago-mendes', 'carla-nunes') and extract(isodow from d) in (4, 5, 6, 7))
    or (c.slug in ('ines-cordeiro', 'andre-sousa') and extract(isodow from d) in (1, 7))
    or (c.slug = 'joana-lopes' and extract(isodow from d) between 2 and 6)
  )
on conflict do nothing;

insert into public.cancellation_policies (chef_id, preset)
select id, 'moderate' from public.chefs where profile_id is null
on conflict do nothing;

insert into public.chef_logistics (chef_id, home_enabled, travel_radius_km, delivery_enabled, delivery_windows, delivery_fee, free_delivery_over, pickup_enabled, kitchen_address)
select id, true, service_radius_km, true, '{12:00–14:00,18:00–20:00}', 3, 40, true, '[Morada da cozinha]'
from public.chefs where profile_id is null
on conflict do nothing;

-- To make someone an admin after they sign up:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
