-- Ao Lume: more cuisine categories, and up to five per chef.

-- World and diaspora cuisines people search for in Portugal.
insert into public.cuisine_categories (slug, name_pt, name_en, sort_order) values
  ('japonesa', 'Japonesa', 'Japanese', 20),
  ('sushi', 'Sushi', 'Sushi', 21),
  ('indiana', 'Indiana', 'Indian', 22),
  ('goesa', 'Goesa', 'Goan', 23),
  ('italiana', 'Italiana', 'Italian', 24),
  ('chinesa', 'Chinesa', 'Chinese', 25),
  ('tailandesa', 'Tailandesa', 'Thai', 26),
  ('vietnamita', 'Vietnamita', 'Vietnamese', 27),
  ('coreana', 'Coreana', 'Korean', 28),
  ('mexicana', 'Mexicana', 'Mexican', 29),
  ('peruana', 'Peruana', 'Peruvian', 30),
  ('francesa', 'Francesa', 'French', 31),
  ('espanhola', 'Espanhola', 'Spanish', 32),
  ('grega', 'Grega', 'Greek', 33),
  ('medio-oriente', 'Médio Oriente', 'Middle Eastern', 34),
  ('marroquina', 'Marroquina', 'Moroccan', 35),
  ('africana', 'Africana', 'African', 36),
  ('cabo-verdiana', 'Cabo-verdiana', 'Cape Verdean', 37),
  ('angolana', 'Angolana', 'Angolan', 38),
  ('mocambicana', 'Moçambicana', 'Mozambican', 39),
  ('americana', 'Americana', 'American', 40),
  ('fusao', 'Fusão', 'Fusion', 41),
  ('churrasco', 'Churrasco', 'Barbecue', 42)
on conflict (slug) do nothing;

-- With many more cuisines, a chef may pick up to five.
create or replace function public.enforce_max_categories() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.chef_categories where chef_id = new.chef_id) >= 5 then
    raise exception 'max_categories' using hint = 'A chef can pick up to 5 cooking categories';
  end if;
  return new;
end $$;
