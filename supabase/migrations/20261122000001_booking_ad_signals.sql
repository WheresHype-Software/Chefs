-- What the Meta Conversions API needs to tie a payment back to the ad that brought the client:
-- the browser's Meta ids (_fbp/_fbc cookies), IP and user agent at the moment of the request.
-- Kept only when the visitor accepted marketing cookies, and deleted as soon as the payment
-- event is sent. Server-only: RLS on with no policies, so only the service role reads it.
create table public.booking_ad_signals (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  fbp text,
  fbc text,
  client_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.booking_ad_signals enable row level security;
revoke all on public.booking_ad_signals from anon, authenticated;
