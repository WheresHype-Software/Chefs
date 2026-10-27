-- Ao Lume: core schema
-- Chefs, offers, availability, bookings, chat, reviews, reports and admin logs.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('client', 'chef', 'admin');
create type public.chef_tier as enum ('professional', 'home');
create type public.chef_status as enum ('draft', 'pending', 'approved', 'rejected', 'suspended');
create type public.service_type as enum ('home', 'delivery', 'pickup', 'events', 'meal_prep');
create type public.fulfilment_mode as enum ('home', 'delivery', 'pickup');
create type public.price_model as enum ('fixed', 'per_person', 'quote');
create type public.booking_status as enum (
  'requested', 'accepted', 'change_proposed', 'declined',
  'confirmed', 'completed', 'cancelled', 'expired'
);
create type public.cancellation_preset as enum ('flexible', 'moderate', 'strict', 'custom');
create type public.photo_kind as enum ('selfie', 'cover', 'portrait', 'gallery');

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  name text,
  email text,
  phone text,
  avatar_url text,
  locale text not null default 'pt-PT',
  created_at timestamptz not null default now()
);

-- A client exists for guests (no profile) and registered users alike.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  email text not null unique,
  phone text,
  name text,
  saved_addresses jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.chefs (
  id uuid primary key default gen_random_uuid(),
  -- Nullable so seeded or admin-created showcase chefs can exist before the chef signs in.
  profile_id uuid unique references public.profiles (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text not null,
  tier public.chef_tier not null default 'home',
  headline text,
  bio text,
  area_name text,
  languages text[] not null default '{pt}',
  socials jsonb not null default '{}',
  years_experience int,
  base_location extensions.geography (point, 4326),
  service_radius_km numeric(5, 1) not null default 10,
  response_time_hours int,
  payment_methods text[] not null default '{mbway,transfer,cash}',
  deposit_percent int check (deposit_percent between 0 and 100),
  status public.chef_status not null default 'draft',
  verification_notes text,
  badges text[] not null default '{}',
  rating_avg numeric(3, 2),
  review_count int not null default 0,
  completed_bookings int not null default 0,
  is_promoted boolean not null default false,
  promoted_until timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chefs_location_idx on public.chefs using gist (base_location);
create index chefs_status_idx on public.chefs (status);

create table public.chef_experience (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  place text not null,
  role text,
  start_year int,
  end_year int,
  description text
);

create table public.chef_certifications (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  title text not null,
  issuer text,
  year int,
  document_path text, -- private storage path, never public
  verified boolean not null default false
);

create table public.chef_service_areas (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  type text not null check (type in ('radius', 'place')),
  center extensions.geography (point, 4326),
  radius_km numeric(5, 1),
  place_name text
);

create table public.chef_photos (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  url text not null,
  kind public.photo_kind not null default 'gallery',
  caption text,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Categories, diets
-- ---------------------------------------------------------------------------
create table public.cuisine_categories (
  id serial primary key,
  slug text not null unique,
  name_pt text not null,
  name_en text not null,
  sort_order int not null default 0
);

create table public.chef_categories (
  chef_id uuid not null references public.chefs (id) on delete cascade,
  category_id int not null references public.cuisine_categories (id) on delete cascade,
  primary key (chef_id, category_id)
);

create table public.diets (
  id serial primary key,
  slug text not null unique,
  name_pt text not null,
  name_en text not null
);

create table public.chef_diets (
  chef_id uuid not null references public.chefs (id) on delete cascade,
  diet_id int not null references public.diets (id) on delete cascade,
  primary key (chef_id, diet_id)
);

create table public.chef_services (
  chef_id uuid not null references public.chefs (id) on delete cascade,
  service public.service_type not null,
  primary key (chef_id, service)
);

-- Max three cooking categories per chef.
create function public.enforce_max_categories() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.chef_categories where chef_id = new.chef_id) >= 3 then
    raise exception 'max_categories' using hint = 'A chef can pick up to 3 cooking categories';
  end if;
  return new;
end $$;

create trigger chef_categories_max before insert on public.chef_categories
  for each row execute function public.enforce_max_categories();

-- ---------------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------------
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  name text not null,
  description text,
  photo_url text,
  allergens text[] not null default '{}',
  dietary_tags text[] not null default '{}'
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  title text not null,
  description text,
  fulfilment_mode public.fulfilment_mode not null default 'home',
  service_types public.service_type[] not null default '{home}',
  price_model public.price_model not null default 'per_person',
  price numeric(8, 2) check (price is null or price >= 0),
  unit_label text not null default 'pessoa', -- "pessoa", "refeição", "bolo"...
  min_guests int not null default 1,
  max_guests int,
  lead_time_hours int not null default 48,
  time_slots text[] not null default '{}', -- e.g. {"19:30","20:00"} or {"Levantar 12:00"}
  meals_per_week int,
  photos text[] not null default '{}',
  dietary_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (price_model = 'quote' or price is not null)
);

create index offers_chef_idx on public.offers (chef_id);

create table public.offer_dishes (
  offer_id uuid not null references public.offers (id) on delete cascade,
  dish_id uuid not null references public.dishes (id) on delete cascade,
  course text,
  sort_order int not null default 0,
  primary key (offer_id, dish_id)
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete cascade,
  label text not null,
  discount_percent int check (discount_percent between 1 and 90),
  starts_at timestamptz,
  ends_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Availability, policies, logistics
-- ---------------------------------------------------------------------------
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  status text not null default 'available' check (status in ('available', 'blocked')),
  unique nulls not distinct (chef_id, date, start_time)
);

create index availability_chef_date_idx on public.availability (chef_id, date);

create table public.cancellation_policies (
  chef_id uuid primary key references public.chefs (id) on delete cascade,
  preset public.cancellation_preset not null default 'moderate',
  custom_text text
);

-- Private: contains the kitchen address. Only the chef and admins read it.
create table public.chef_logistics (
  chef_id uuid primary key references public.chefs (id) on delete cascade,
  home_enabled boolean not null default true,
  travel_radius_km numeric(5, 1) not null default 15,
  free_distance_km numeric(5, 1) not null default 10,
  fee_per_km numeric(6, 2) not null default 0.40,
  arrival_minutes_before int not null default 120,
  delivery_enabled boolean not null default false,
  delivery_windows text[] not null default '{}',
  delivery_fee numeric(6, 2),
  free_delivery_over numeric(8, 2),
  delivered_by text not null default 'chef' check (delivered_by in ('chef', 'courier')),
  pickup_enabled boolean not null default false,
  kitchen_address text,
  kitchen_location extensions.geography (point, 4326)
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  name text not null, -- freguesia / neighbourhood
  postcode_prefix text,
  active boolean not null default true
);

create table public.pickup_slots (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  label text not null, -- "10:30–11:30"
  active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Bookings and chat
-- ---------------------------------------------------------------------------
create sequence public.booking_ref_seq start 482;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('AL-' || to_char(now(), 'MMDD') || '-' || lpad(nextval('public.booking_ref_seq')::text, 4, '0')),
  chef_id uuid not null references public.chefs (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,
  offer_id uuid references public.offers (id) on delete set null,
  offer_title text not null, -- snapshot
  fulfilment_mode public.fulfilment_mode not null,
  date date not null,
  time_label text,
  guests int not null check (guests > 0),
  -- Visible only to the booking's chef, the client and admins (RLS on bookings).
  address text,
  location extensions.geography (point, 4326),
  distance_km numeric(6, 1),
  notes text,
  status public.booking_status not null default 'requested',
  estimate numeric(10, 2),
  quoted_price numeric(10, 2),
  proposed_date date,
  proposed_time text,
  decline_reason text,
  pickup_code text,
  show_in_showcase boolean not null default false,
  accepted_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_by text check (cancelled_by in ('client', 'chef', 'system', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_chef_idx on public.bookings (chef_id, date);
create index bookings_client_idx on public.bookings (client_id);
create index bookings_status_idx on public.bookings (status);

create table public.booking_events (
  id bigserial primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  actor text not null, -- 'client' | 'chef' | 'system' | 'admin'
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.chefs (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  unique (chef_id, client_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender text not null check (sender in ('client', 'chef', 'system')),
  body text not null check (length(body) between 1 and 4000),
  attachments text[] not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Reviews, reports, tokens, admin
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  chef_id uuid not null references public.chefs (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  author_name text not null,
  food int not null check (food between 1 and 5),
  presentation int not null check (presentation between 1 and 5),
  punctuality int not null check (punctuality between 1 and 5),
  communication int not null check (communication between 1 and 5),
  value int not null check (value between 1 and 5),
  overall numeric(3, 2) generated always as ((food + presentation + punctuality + communication + value) / 5.0) stored,
  comment text,
  photos text[] not null default '{}' check (cardinality(photos) <= 5),
  chef_reply text,
  chef_replied_at timestamptz,
  allow_showcase boolean not null default false,
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now()
);

create index reviews_chef_idx on public.reviews (chef_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter text not null, -- profile id or client email
  target_type text not null check (target_type in ('review', 'conversation', 'chef', 'client', 'message')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.guest_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '90 days',
  created_at timestamptz not null default now()
);

create table public.admin_logs (
  id bigserial primary key,
  admin_id uuid references public.profiles (id),
  action text not null,
  target text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger chefs_touch before update on public.chefs
  for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- New auth user -> profile; registered client email claims guest history
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data ->> 'role' = 'chef' then 'chef'::public.user_role else 'client'::public.user_role end
  );
  -- Guest bookings, chats and reviews made with this email attach to the new account.
  update public.clients set profile_id = new.id where lower(email) = lower(new.email) and profile_id is null;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
