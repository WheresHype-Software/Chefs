-- Ao Lume: remove the showcase chefs seeded by supabase/seed-showcase.sql.
--
-- They are the ten demo profiles with no auth account (profile_id is null).
-- Everything hanging off a chef cascades (offers, availability, photos,
-- categories, services, policies, logistics, reviews, conversations), so the
-- single delete below is enough.
--
-- Bookings are the exception: bookings.chef_id is "on delete restrict", so if a
-- real visitor ever requested one of these chefs the delete fails instead of
-- silently dropping their request. Run step 1 first and decide what to do.

-- 1. Anything real attached to the demo chefs? Expect 0 rows.
select c.slug, count(b.id) as bookings
from public.chefs c
left join public.bookings b on b.chef_id = c.id
where c.profile_id is null
group by c.slug
having count(b.id) > 0;

-- 2. What is about to go. Expect the ten showcase slugs and nothing else.
select slug, name, status from public.chefs where profile_id is null order by slug;

-- 3. Remove them.
delete from public.chefs where profile_id is null;

-- 4. Confirm the listing is empty (until the ads bring real chefs in).
select count(*) as remaining_chefs from public.chefs;
