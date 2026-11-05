# Ao Lume — product

## What it is

A Portuguese marketplace that connects people with private chefs and home cooks near them: dinners cooked in the client's home, weekly meal prep, cakes and pastry, deliveries, pickups and events. Ao Lume is a connector, not a food business. The chef sets the price.

**How the money works.** Once the chef accepts, the client pays the chef's deposit through the app (MB WAY or a Multibanco reference, processed by EuPago). Ao Lume receives it in the chef's name, keeps a commission on the booking value, and transfers the rest to the chef after the service, with a payment document. The rest of the price is still settled directly between client and chef. Everything sits behind `PAYMENTS_ENABLED`; with it off the site behaves as it did before.

## Who it serves

- **Clients:** residents of Lisbon and Porto first (families, couples, people hosting a celebration, busy workers), plus expats. They browse on the phone in the evening or at lunch, and want to trust a chef quickly and send a request in under two minutes, without creating an account.
- **Chefs:** professional private chefs and home cooks who today take orders through Instagram DMs and Google Forms. They want a proper page, a calendar, a chat per booking and verified reviews. Listing is free; the platform only earns when a booking is paid.

## What the product must prove

- There is someone good cooking near me, free on my date, at a price I can see.
- I can trust them: verified identity and portfolio, reviews only from completed bookings.
- Asking costs nothing: no account, no payment until the chef accepts and we agree.

## Constraints

- Language: European Portuguese first (pt-PT), English later.
- Claims: no invented prices, reviews, customers or statistics on public pages. Placeholder content is marked as such. Public pages state the real commission, read from `platform_settings`, never a number hardcoded in a component.
- Money: no amount is ever accepted from the browser, and the payment tables are append-only. See `docs/specs/pagamentos-marketplace.md`.
- Photography: currently temporary Unsplash stock (`lib/photos.ts`); replace with real chefs and dishes before launch.
- Map: search results show as a list beside a map of chef zones (Lista / Mapa switch on phones). Travel times are estimates from distance, not routes. Tiles, geocoding and estimates are all free (OpenFreeMap, Photon, no API keys).
