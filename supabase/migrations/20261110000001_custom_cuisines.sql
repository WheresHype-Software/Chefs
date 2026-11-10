-- Ao Lume: chefs can add a cuisine that isn't on the list.
--
-- The list covers what people search for most, but not every cuisine a chef cooks. A chef can
-- add one; it goes on their profile at once. created_by marks it as theirs, so the dashboard
-- offers it only to them and the admin can review, rename or merge it later. Search filters still
-- come from the curated list; a chef-added cuisine is matched by name like any other.

alter table public.cuisine_categories
  add column if not exists created_by uuid references auth.users (id) on delete set null;

comment on column public.cuisine_categories.created_by is
  'The chef''s user who added this cuisine. Null for the curated list.';

-- Finds or adds a cuisine by name and returns its id. Security definer: chefs can't write to the
-- table directly (only admins can), so this is their one, narrow way in.
create or replace function public.add_cuisine_category(p_name text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_slug text;
  v_id int;
begin
  if auth.uid() is null or not exists (select 1 from public.chefs where profile_id = auth.uid()) then
    raise exception 'not_a_chef';
  end if;
  v_slug := btrim(
    regexp_replace(
      translate(lower(v_name), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
      '[^a-z0-9]+', '-', 'g'),
    '-');
  if char_length(v_name) < 3 or char_length(v_name) > 40 or v_slug = '' then
    raise exception 'bad_name';
  end if;

  -- Already there (curated or added by anyone): use it rather than add a twin.
  select id into v_id from public.cuisine_categories
  where slug = v_slug or lower(name_pt) = lower(v_name) or lower(name_en) = lower(v_name)
  order by created_by nulls first
  limit 1;
  if v_id is not null then
    return v_id;
  end if;

  if (select count(*) from public.cuisine_categories where created_by = auth.uid()) >= 3 then
    raise exception 'too_many';
  end if;

  insert into public.cuisine_categories (slug, name_pt, name_en, sort_order, created_by)
  values (v_slug, upper(left(v_name, 1)) || substr(v_name, 2), v_name, 1000, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.add_cuisine_category(text) from public, anon;
grant execute on function public.add_cuisine_category(text) to authenticated;
