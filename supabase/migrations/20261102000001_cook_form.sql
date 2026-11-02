-- Ao Lume: "Cozinheiro" or "Cozinheira", chosen by the chef.
--
-- The choice is mirrored into badges as "cozinheira", so every place that already carries a
-- chef's badges (search cards, chef page, bookings, emails) knows the title without new joins.
-- The trigger is named to fire after chefs_guard, which resets badges on chef updates.

alter table public.chefs
  add column if not exists cook_form text not null default 'cozinheiro'
  check (cook_form in ('cozinheiro', 'cozinheira'));

create or replace function public.sync_cook_form() returns trigger
language plpgsql set search_path = public as $$
begin
  new.badges := array_remove(new.badges, 'cozinheira');
  if new.cook_form = 'cozinheira' then
    new.badges := new.badges || 'cozinheira'::text;
  end if;
  return new;
end;
$$;

drop trigger if exists chefs_zz_cook_form on public.chefs;
create trigger chefs_zz_cook_form before insert or update on public.chefs
  for each row execute function public.sync_cook_form();
