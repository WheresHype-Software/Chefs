-- Ao Lume: row level security
-- Public reads: approved chefs, their active offers and visible reviews.
-- Chefs: only their own data. Clients: only their bookings and chats. Admins: everything.

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create function public.my_chef_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.chefs where profile_id = auth.uid();
$$;

create function public.my_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.clients where profile_id = auth.uid();
$$;

create function public.chef_is_public(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chefs where id = cid and status = 'approved');
$$;

-- Chefs can't grant themselves approval, badges, ratings or promotion.
create function public.guard_chef_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Admins, server jobs and internal counters (ratings, completed bookings) pass through.
  if public.is_admin() or auth.uid() is null or current_setting('app.internal', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.badges := '{}';
    new.rating_avg := null;
    new.review_count := 0;
    new.completed_bookings := 0;
    new.is_promoted := false;
    new.promoted_until := null;
    new.approved_at := null;
    new.verification_notes := null;
    return new;
  end if;
  -- A chef may only move draft/rejected -> pending (submit for review).
  if new.status is distinct from old.status
     and not (old.status in ('draft', 'rejected') and new.status = 'pending') then
    raise exception 'status_change_not_allowed';
  end if;
  new.badges := old.badges;
  new.rating_avg := old.rating_avg;
  new.review_count := old.review_count;
  new.completed_bookings := old.completed_bookings;
  new.is_promoted := old.is_promoted;
  new.promoted_until := old.promoted_until;
  new.approved_at := old.approved_at;
  new.verification_notes := old.verification_notes;
  return new;
end $$;

create trigger chefs_guard before insert or update on public.chefs
  for each row execute function public.guard_chef_columns();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.chefs enable row level security;
alter table public.chef_experience enable row level security;
alter table public.chef_certifications enable row level security;
alter table public.chef_service_areas enable row level security;
alter table public.chef_photos enable row level security;
alter table public.cuisine_categories enable row level security;
alter table public.chef_categories enable row level security;
alter table public.diets enable row level security;
alter table public.chef_diets enable row level security;
alter table public.chef_services enable row level security;
alter table public.dishes enable row level security;
alter table public.offers enable row level security;
alter table public.offer_dishes enable row level security;
alter table public.promotions enable row level security;
alter table public.availability enable row level security;
alter table public.cancellation_policies enable row level security;
alter table public.chef_logistics enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.pickup_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.guest_tokens enable row level security;
alter table public.admin_logs enable row level security;

-- profiles
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
-- Users can edit their profile but not their role.
create function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create policy profiles_self_update on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());
create policy profiles_admin on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- clients
create policy clients_self on public.clients for select using (profile_id = auth.uid() or public.is_admin());
create policy clients_self_update on public.clients for update using (profile_id = auth.uid());
-- Chefs see the clients of their own bookings.
create policy clients_chef_read on public.clients for select using (
  exists (select 1 from public.bookings b where b.client_id = clients.id and b.chef_id = public.my_chef_id())
);

-- chefs
create policy chefs_public_read on public.chefs for select using (status = 'approved');
create policy chefs_owner_read on public.chefs for select using (profile_id = auth.uid());
create policy chefs_owner_insert on public.chefs for insert with check (profile_id = auth.uid());
create policy chefs_owner_update on public.chefs for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy chefs_admin on public.chefs for all using (public.is_admin()) with check (public.is_admin());

-- Chef-owned child tables: public read when the chef is approved, owner full access, admin full access.
do $$
declare t text;
begin
  foreach t in array array[
    'chef_experience', 'chef_service_areas', 'chef_photos', 'chef_categories', 'chef_diets',
    'chef_services', 'dishes', 'promotions', 'availability', 'cancellation_policies',
    'delivery_zones', 'pickup_slots'
  ] loop
    execute format('create policy %1$s_public_read on public.%1$s for select using (public.chef_is_public(chef_id))', t);
    execute format('create policy %1$s_owner on public.%1$s for all using (chef_id = public.my_chef_id()) with check (chef_id = public.my_chef_id())', t);
    execute format('create policy %1$s_admin on public.%1$s for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Certifications: public sees title/issuer only through the API; documents stay private in storage.
create policy chef_certifications_public_read on public.chef_certifications for select using (public.chef_is_public(chef_id));
create policy chef_certifications_owner on public.chef_certifications for all using (chef_id = public.my_chef_id()) with check (chef_id = public.my_chef_id());
create policy chef_certifications_admin on public.chef_certifications for all using (public.is_admin()) with check (public.is_admin());

-- Logistics hold the private kitchen address: owner and admin only.
create policy chef_logistics_owner on public.chef_logistics for all using (chef_id = public.my_chef_id()) with check (chef_id = public.my_chef_id());
create policy chef_logistics_admin on public.chef_logistics for all using (public.is_admin()) with check (public.is_admin());

-- offers
create policy offers_public_read on public.offers for select using (active and public.chef_is_public(chef_id));
create policy offers_owner on public.offers for all using (chef_id = public.my_chef_id()) with check (chef_id = public.my_chef_id());
create policy offers_admin on public.offers for all using (public.is_admin()) with check (public.is_admin());

create policy offer_dishes_public_read on public.offer_dishes for select using (
  exists (select 1 from public.offers o where o.id = offer_id and o.active and public.chef_is_public(o.chef_id))
);
create policy offer_dishes_owner on public.offer_dishes for all using (
  exists (select 1 from public.offers o where o.id = offer_id and o.chef_id = public.my_chef_id())
) with check (
  exists (select 1 from public.offers o where o.id = offer_id and o.chef_id = public.my_chef_id())
);

-- lookup tables
create policy cuisine_categories_read on public.cuisine_categories for select using (true);
create policy cuisine_categories_admin on public.cuisine_categories for all using (public.is_admin()) with check (public.is_admin());
create policy diets_read on public.diets for select using (true);
create policy diets_admin on public.diets for all using (public.is_admin()) with check (public.is_admin());

-- bookings: inserts go through request_booking(); chefs update through the status trigger.
create policy bookings_chef_read on public.bookings for select using (chef_id = public.my_chef_id());
create policy bookings_chef_update on public.bookings for update using (chef_id = public.my_chef_id()) with check (chef_id = public.my_chef_id());
create policy bookings_client_read on public.bookings for select using (client_id = public.my_client_id());
create policy bookings_admin_read on public.bookings for select using (public.is_admin());

create policy booking_events_read on public.booking_events for select using (
  public.is_admin() or exists (
    select 1 from public.bookings b where b.id = booking_id
      and (b.chef_id = public.my_chef_id() or b.client_id = public.my_client_id())
  )
);

-- chat
create policy conversations_participants on public.conversations for select using (
  chef_id = public.my_chef_id() or client_id = public.my_client_id() or public.is_admin()
);
create policy messages_participants_read on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id
    and (c.chef_id = public.my_chef_id() or c.client_id = public.my_client_id() or public.is_admin()))
);
create policy messages_chef_insert on public.messages for insert with check (
  sender = 'chef' and exists (select 1 from public.conversations c where c.id = conversation_id and c.chef_id = public.my_chef_id())
);
create policy messages_client_insert on public.messages for insert with check (
  sender = 'client' and exists (select 1 from public.conversations c where c.id = conversation_id and c.client_id = public.my_client_id())
);
create policy messages_mark_read on public.messages for update using (
  exists (select 1 from public.conversations c where c.id = conversation_id
    and (c.chef_id = public.my_chef_id() or c.client_id = public.my_client_id()))
);

-- reviews: inserts go through submit_review(); chef replies through reply_to_review().
create policy reviews_public_read on public.reviews for select using (status = 'visible' and public.chef_is_public(chef_id));
create policy reviews_chef_read on public.reviews for select using (chef_id = public.my_chef_id());
create policy reviews_admin on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- reports
create policy reports_insert on public.reports for insert with check (auth.uid() is not null);
create policy reports_admin on public.reports for all using (public.is_admin()) with check (public.is_admin());

-- guest_tokens: no direct access, only security-definer functions.

-- admin_logs
create policy admin_logs_admin on public.admin_logs for all using (public.is_admin()) with check (public.is_admin());
