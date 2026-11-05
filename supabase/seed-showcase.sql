-- Ao Lume: showcase chefs spread across Portugal.
--
-- These are demo profiles, not real people: profile_id is null, so they have no auth
-- account and nobody can sign in as them. Photos are stock images uploaded to the
-- chef-photos bucket by scripts/seed-showcase-photos.mjs.
--
-- Idempotent: safe to run more than once (every insert is guarded by slug).
-- They land as 'pending' so they stay invisible until their photos are in place;
-- scripts/seed-showcase-photos.mjs flips them to 'approved' once it finishes.
--
-- To remove them all later (cascades offers, availability, photos, policies, logistics):
--   delete from public.chefs where profile_id is null;

-- The chefs_guard trigger resets status/badges for non-admin writers. Seeding is an
-- internal write, same as supabase/seed.sql relies on. Session-scoped so this works
-- whether or not the caller wraps the file in its own transaction.
select set_config('app.internal', 'on', false);

with demo (slug, name, form, tier, area, lat, lng, radius, response, years, langs,
          headline, bio, cats, svcs) as (values
  ('matilde-antunes', 'Matilde Antunes', 'cozinheira', 'professional', 'Cedofeita, Porto',
   41.1570, -8.6200, 20, 2, 14, array['pt','en'],
   'Cozinha do Porto, à mesa de casa',
   'Vinte anos de cozinha no Porto, agora em casa dos outros. Tripas à moda quando pedem, mas o que gosto mesmo é de peixe fresco da Matosinhos comprado nessa manhã.',
   array['portuguesa','marisco-peixe'], array['home','events']::public.service_type[]),

  ('goncalo-peixoto', 'Gonçalo Peixoto', 'cozinheiro', 'home', 'São Vítor, Braga',
   41.5503, -8.4201, 15, 4, 6, array['pt'],
   'Minho à antiga',
   'Cozinho o que a minha avó cozinhava: rojões, papas de sarrabulho, arroz de forno. Levo tudo pronto e acabo na sua cozinha.',
   array['portuguesa','grelhados'], array['home','delivery']::public.service_type[]),

  ('sofia-marnoto', 'Sofia Marnoto', 'cozinheira', 'professional', 'Glória, Aveiro',
   40.6405, -8.6538, 25, 3, 11, array['pt','en'],
   'Peixe da ria',
   'Enguias, caldeirada, ovos moles para acabar. Trabalho com o que a ria dá e com o que os pescadores de Costa Nova trazem.',
   array['marisco-peixe','portuguesa'], array['home','events']::public.service_type[]),

  ('hugo-valadares', 'Hugo Valadares', 'cozinheiro', 'home', 'Viseu',
   40.6566, -7.9125, 18, 6, 5, array['pt'],
   'Grelha e churrasco na Beira',
   'Levo a grelha, o carvão e a carne do talho de confiança. Cabrito, posta, entremeada. Funciona melhor no quintal.',
   array['grelhados','churrasco'], array['home','events']::public.service_type[]),

  ('benedita-prata', 'Benedita Prata', 'cozinheira', 'professional', 'Sé Nova, Coimbra',
   40.2110, -8.4290, 22, 2, 9, array['pt','en','fr'],
   'Cozinha de autor com produto da Beira',
   'Menu de degustação que muda com a época. Sete momentos, produto pequeno de produtores da Beira, serviço à mesa.',
   array['autor','mediterranica'], array['home','events']::public.service_type[]),

  ('vasco-lemos', 'Vasco Lemos', 'cozinheiro', 'home', 'Nazaré',
   39.6013, -9.0708, 20, 5, 7, array['pt','en'],
   'Caldeirada à moda da Nazaré',
   'Peixe comprado na lota de manhã, caldeirada feita devagar à tarde. Também faço arroz de marisco para mesas grandes.',
   array['marisco-peixe','petiscos'], array['home','delivery','pickup']::public.service_type[]),

  ('clara-seabra', 'Clara Seabra', 'cozinheira', 'professional', 'Príncipe Real, Lisboa',
   38.7170, -9.1490, 18, 1, 13, array['pt','en','es'],
   'Cozinha de autor em Lisboa',
   'Treze anos de cozinha profissional em Lisboa. Faço jantares pequenos, de dois a doze, com produto português e técnica de restaurante.',
   array['autor','fusao'], array['home','events']::public.service_type[]),

  ('diogo-vilares', 'Diogo Vilares', 'cozinheiro', 'home', 'Troino, Setúbal',
   38.5244, -8.8882, 16, 4, 4, array['pt'],
   'Petiscos e choco frito',
   'Choco frito como deve ser, ameijoas da Sado, salada de polvo. Petiscos para partilhar em festas de casa.',
   array['petiscos','marisco-peixe'], array['home','events','delivery']::public.service_type[]),

  ('teresa-alcobia', 'Teresa Alcobia', 'cozinheira', 'professional', 'Centro Histórico, Évora',
   38.5714, -7.9135, 30, 3, 16, array['pt','en'],
   'Alentejo de tacho',
   'Açorda, migas, ensopado de borrego, sericaia com ameixa. Cozinha alentejana a sério, sem pressas, para mesas longas.',
   array['portuguesa','mediterranica'], array['home','events']::public.service_type[]),

  ('nuno-calvario', 'Nuno Calvário', 'cozinheiro', 'home', 'Tavira, Algarve',
   37.1273, -7.6506, 25, 5, 8, array['pt','en','de'],
   'Algarve na brasa',
   'Atum da costa, lulas, cataplana de peixe. Cozinho na brasa no terraço e sirvo à medida que vai saindo.',
   array['grelhados','marisco-peixe'], array['home','events','delivery']::public.service_type[])
),
ins as (
  insert into public.chefs (
    slug, display_name, cook_form, tier, area_name, base_location, service_radius_km,
    response_time_hours, headline, bio, status, years_experience, languages,
    badges, deposit_percent, payment_methods
  )
  select
    d.slug, d.name, d.form, d.tier::public.chef_tier, d.area,
    extensions.st_setsrid(extensions.st_makepoint(d.lng, d.lat), 4326)::extensions.geography,
    d.radius, d.response, d.headline, d.bio, 'pending', d.years, d.langs,
    array['identity', 'portfolio'], 30, array['mbway', 'transfer', 'cash']
  from demo d
  where not exists (select 1 from public.chefs c where c.slug = d.slug)
  returning id, slug
),
cats as (
  insert into public.chef_categories (chef_id, category_id)
  select ins.id, k.id
  from ins
  join demo on demo.slug = ins.slug
  cross join lateral unnest(demo.cats) as c(slug)
  join public.cuisine_categories k on k.slug = c.slug
  on conflict do nothing
  returning 1
)
insert into public.chef_services (chef_id, service)
select ins.id, s
from ins
join demo on demo.slug = ins.slug
cross join lateral unnest(demo.svcs) as s
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Offers: two per chef.
-- ---------------------------------------------------------------------------
insert into public.offers (chef_id, title, description, fulfilment_mode, service_types,
                           price_model, price, unit_label, min_guests, max_guests,
                           lead_time_hours, time_slots, sort_order)
select c.id, o.title, o.descr, o.mode::public.fulfilment_mode, o.svc::public.service_type[],
       o.model::public.price_model, o.price, o.unit, o.min_g, o.max_g, o.lead, o.slots, o.ord
from (values
  ('matilde-antunes', 'Jantar do Porto', 'Caldo verde · Bacalhau à Gomes de Sá · Arroz de pato · Leite-creme queimado', 'home', '{home}', 'per_person', 52, 'pessoa', 2, 14, 48, '{13:00,19:30,20:00}'::text[], 1),
  ('matilde-antunes', 'Peixe de Matosinhos', 'Robalo ou sargo inteiro na grelha, batata a murro, salada de tomate', 'home', '{home}', 'per_person', 68, 'pessoa', 2, 10, 72, '{13:00,20:00}', 2),
  ('goncalo-peixoto', 'Mesa minhota', 'Rojões com sarrabulho · Arroz de forno · Pudim', 'home', '{home}', 'per_person', 38, 'pessoa', 4, 16, 48, '{13:00,20:00}', 1),
  ('goncalo-peixoto', 'Entrega de domingo', 'Tacho para levar: arroz de forno e carne de porco à alentejana', 'delivery', '{delivery}', 'per_person', 14, 'refeição', 4, 20, 72, '{"Entrega 11:00–13:00"}', 2),
  ('sofia-marnoto', 'Mesa da ria', 'Ameijoas à Bulhão Pato · Caldeirada da ria · Ovos moles', 'home', '{home}', 'per_person', 58, 'pessoa', 2, 12, 48, '{13:00,19:30,20:00}', 1),
  ('sofia-marnoto', 'Mariscada', 'Sapateira, camarão, gambas da costa e arroz de marisco', 'home', '{home}', 'per_person', 78, 'pessoa', 4, 12, 96, '{13:00,20:00}', 2),
  ('hugo-valadares', 'Churrasco no quintal', 'Entremeada, frango, chouriço, batata e três saladas', 'home', '{home}', 'per_person', 29, 'pessoa', 6, 30, 48, '{13:00,19:00,20:00}', 1),
  ('hugo-valadares', 'Cabrito na brasa', 'Cabrito da Beira, arroz de forno, grelos', 'home', '{home}', 'quote', null, 'evento', 8, 25, 120, '{13:00,20:00}', 2),
  ('benedita-prata', 'Degustação da Beira', 'Sete momentos com produto da época', 'home', '{home}', 'per_person', 72, 'pessoa', 4, 10, 96, '{13:00,20:00}', 1),
  ('benedita-prata', 'Com harmonização', 'Sete momentos e quatro vinhos da Bairrada e do Dão', 'home', '{home}', 'per_person', 95, 'pessoa', 4, 10, 96, '{20:00}', 2),
  ('vasco-lemos', 'Caldeirada à Nazarena', 'Peixe da lota, batata, pimento e coentros. Feita devagar.', 'home', '{home}', 'per_person', 42, 'pessoa', 4, 16, 48, '{13:00,19:30}', 1),
  ('vasco-lemos', 'Arroz de marisco para levar', 'Tacho de arroz de marisco, para levantar ou entregar', 'delivery', '{delivery,pickup}', 'per_person', 19, 'pessoa', 4, 20, 72, '{"Levantar 12:00","Entrega 18:30–20:00"}', 2),
  ('clara-seabra', 'Jantar de autor', 'Cinco momentos, produto português, servidos à mesa', 'home', '{home}', 'per_person', 70, 'pessoa', 2, 12, 72, '{19:30,20:00,20:30}', 1),
  ('clara-seabra', 'Almoço de domingo', 'Três tempos mais leves, para mesas de família', 'home', '{home}', 'per_person', 45, 'pessoa', 4, 12, 72, '{12:30,13:00}', 2),
  ('diogo-vilares', 'Petiscos do Sado', 'Choco frito · Ameijoas · Salada de polvo · Queijadas', 'home', '{home,events}', 'per_person', 26, 'pessoa', 6, 25, 48, '{12:30,19:00,20:00}', 1),
  ('diogo-vilares', 'Mesa de petiscos entregue', 'Oito petiscos frios e quentes, entregues e montados', 'delivery', '{events,delivery}', 'per_person', 21, 'pessoa', 8, 40, 72, '{12:30,19:00}', 2),
  ('teresa-alcobia', 'Mesa alentejana', 'Açorda de bacalhau · Ensopado de borrego · Sericaia com ameixa', 'home', '{home}', 'per_person', 48, 'pessoa', 4, 20, 72, '{13:00,20:00}', 1),
  ('teresa-alcobia', 'Porco preto e migas', 'Secretos de porco preto, migas de espargos, doce conventual', 'home', '{home,events}', 'per_person', 56, 'pessoa', 4, 20, 72, '{13:00,20:00}', 2),
  ('nuno-calvario', 'Brasa no terraço', 'Atum da costa, lulas, sardinha na época, batata-doce', 'home', '{home}', 'per_person', 44, 'pessoa', 4, 18, 48, '{13:00,19:30,20:30}', 1),
  ('nuno-calvario', 'Cataplana de peixe', 'Cataplana para a mesa toda, com pão de Tavira', 'home', '{home,events}', 'per_person', 52, 'pessoa', 4, 14, 72, '{13:00,20:00}', 2)
) as o(slug, title, descr, mode, svc, model, price, unit, min_g, max_g, lead, slots, ord)
join public.chefs c on c.slug = o.slug
where not exists (select 1 from public.offers x where x.chef_id = c.id and x.title = o.title);

-- ---------------------------------------------------------------------------
-- Availability, policies, logistics for the showcase chefs only.
-- ---------------------------------------------------------------------------
-- Weekends for most, plus a couple of weekday cooks. Next 60 days.
insert into public.availability (chef_id, date, status)
select c.id, d::date, 'available'
from public.chefs c
cross join generate_series(current_date + 2, current_date + 60, interval '1 day') d
where c.profile_id is null
  and c.slug in ('matilde-antunes','goncalo-peixoto','sofia-marnoto','hugo-valadares',
                 'benedita-prata','vasco-lemos','clara-seabra','diogo-vilares',
                 'teresa-alcobia','nuno-calvario')
  and (
    (c.slug in ('matilde-antunes','sofia-marnoto','benedita-prata','clara-seabra','teresa-alcobia')
       and extract(isodow from d) in (4, 5, 6, 7))
 or (c.slug in ('goncalo-peixoto','vasco-lemos','nuno-calvario')
       and extract(isodow from d) in (5, 6, 7))
 or (c.slug in ('hugo-valadares','diogo-vilares')
       and extract(isodow from d) in (6, 7))
)
on conflict do nothing;

insert into public.cancellation_policies (chef_id, preset)
select c.id, 'moderate'
from public.chefs c
where c.profile_id is null
  and c.slug in ('matilde-antunes','goncalo-peixoto','sofia-marnoto','hugo-valadares',
                 'benedita-prata','vasco-lemos','clara-seabra','diogo-vilares',
                 'teresa-alcobia','nuno-calvario')
on conflict do nothing;

insert into public.chef_logistics (chef_id, home_enabled, travel_radius_km, free_distance_km,
                                   fee_per_km, delivery_enabled, delivery_windows, delivery_fee,
                                   free_delivery_over, pickup_enabled, kitchen_address)
select c.id, true, c.service_radius_km, 10, 0.40,
       exists (select 1 from public.chef_services cs where cs.chef_id = c.id and cs.service = 'delivery'),
       '{12:00–14:00,18:00–20:00}', 3.5, 45,
       exists (select 1 from public.chef_services cs where cs.chef_id = c.id and cs.service = 'pickup'),
       '[Morada da cozinha]'
from public.chefs c
where c.profile_id is null
  and c.slug in ('matilde-antunes','goncalo-peixoto','sofia-marnoto','hugo-valadares',
                 'benedita-prata','vasco-lemos','clara-seabra','diogo-vilares',
                 'teresa-alcobia','nuno-calvario')
on conflict do nothing;