-- Language of each person, so emails go out in the language they used on the site.
-- Values are BCP 47 tags: 'pt-PT' (default, everyone so far) or 'en-GB'.

-- Accounts: already had profiles.locale (default 'pt-PT'); now only known values.
update public.profiles set locale = 'pt-PT' where locale is null or locale not in ('pt-PT', 'en-GB');
alter table public.profiles
  add constraint profiles_locale_known check (locale in ('pt-PT', 'en-GB'));

-- Guests (no account): the language of their last request.
alter table public.clients
  add column locale text not null default 'pt-PT'
  constraint clients_locale_known check (locale in ('pt-PT', 'en-GB'));

-- New accounts take the language of the sign-up form (auth metadata "locale").
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role, locale)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data ->> 'role' = 'chef' then 'chef'::public.user_role else 'client'::public.user_role end,
    case when new.raw_user_meta_data ->> 'locale' = 'en-GB' then 'en-GB' else 'pt-PT' end
  );
  -- Guest bookings, chats and reviews made with this email attach to the new account.
  update public.clients set profile_id = new.id where lower(email) = lower(new.email) and profile_id is null;
  return new;
end $$;
