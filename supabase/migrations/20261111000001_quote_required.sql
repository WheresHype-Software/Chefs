-- Ao Lume: a booking is never accepted without a value
--
-- A request for a "sob orçamento" offer arrives with no price. If the chef pressed "Aceitar"
-- straight away, the booking was accepted with no value: no signal asked of the client, no
-- commission, and nothing holding the date. From here on:
--
--   1. Nothing reaches "accepted" without a value (the chef's quote or the offer's estimate).
--   2. With payments on, a quote must be big enough for the signal to carry the whole minimum
--      commission (platform_settings.commission_min). A 1 € quote is refused.
--
-- A separate trigger, named to run before bookings_status_guard (triggers fire in name order), so
-- the long guard function stays as it is. The team (admin) can still do anything by hand.

create function public.booking_value_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_actor text := coalesce(nullif(current_setting('app.actor', true), ''),
                           case when public.is_admin() then 'admin' else 'other' end);
  v_deposit int;
  m public.booking_money;
begin
  if v_actor = 'admin' then return new; end if;

  -- 2. A quote that would not pay for the minimum commission.
  if new.quoted_price is not null and new.quoted_price is distinct from old.quoted_price and public.payments_on() then
    select deposit_percent into v_deposit from public.chefs where id = new.chef_id;
    if coalesce(v_deposit, 0) > 0 then
      m := public.compute_booking_money(new.quoted_price, v_deposit);
      if m.capped or new.quoted_price <= 0 then
        raise exception 'quote_below_minimum';
      end if;
    end if;
  end if;

  -- 1. Accepted with no value at all.
  if new.status = 'accepted' and old.status is distinct from 'accepted'
     and coalesce(new.quoted_price, new.estimate) is null then
    raise exception 'price_required';
  end if;
  return new;
end $$;

create trigger bookings_a_value_guard before update on public.bookings
  for each row execute function public.booking_value_guard();
