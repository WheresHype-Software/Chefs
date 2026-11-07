-- Marca de que já se avisou a equipa desta inscrição.
--
-- A conta nasce de um trigger em auth.users, sem passar por nenhum código nosso no servidor, por
-- isso não há onde enviar o aviso no momento exacto. O que há é o primeiro pedido autenticado,
-- que acontece logo a seguir porque o browser é levado para uma página nossa. É aí que se avisa,
-- e esta coluna garante que se avisa uma vez só: quem conseguir escrever a data é quem envia.
alter table public.profiles add column if not exists signup_announced_at timestamptz;

comment on column public.profiles.signup_announced_at is
  'Quando a equipa foi avisada desta inscrição. Null significa que ainda não foi.';
