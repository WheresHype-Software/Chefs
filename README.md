# Ao Lume

Private chefs and home cooks near you. Clients find chefs on a map, read their showcase, and send a booking request; chefs manage requests, chat, calendar, offers and logistics from a dashboard. When a chef accepts, the client pays the deposit through the app (EuPago); the platform keeps a commission and pays the chef after the service.

Built from the project spec ("Private Chef Platform – Project Spec") and the V2 "chef's whites" mockups (Bodoni Moda + Hanken Grotesk, white, black ink, hairlines, square corners).

## Stack

- Next.js 16 (App Router, server actions), TypeScript, Tailwind CSS 4
- EuPago for payments (MB WAY, Multibanco references, refunds); SEPA files for paying chefs
- Supabase: Postgres + PostGIS, Auth, Storage, pg_cron, Row Level Security
- MapLibre GL + OpenFreeMap tiles (free, no API key) and Photon geocoding (free, OpenStreetMap data)
- Resend for email (optional)
- Unit tests with `node --test` (`npm test`), end-to-end with Playwright

## Run it

```bash
npm install
npm run dev
```

Without Supabase credentials the app runs in **demo mode**: search, chef pages and the booking form use the seed chefs from `lib/mock.ts`, a sent request opens an example booking at `/reserva/demo`, and `/dashboard` shows the chef dashboard with example data. Nothing is saved.

## Connect Supabase

1. Create a Supabase project (region `eu-central-1` or `eu-west-*` for Portugal).
2. Apply the migrations in `supabase/migrations/` in order, then `supabase/seed.sql`:
   - with the CLI: `supabase link --project-ref <ref>` → `supabase db push` → run `seed.sql` in the SQL editor, or
   - paste each file into the SQL editor in order.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API keys).
4. In Supabase → Authentication → URL configuration, add `http://localhost:3000/auth/callback` (and your production URL) to the redirect URLs. Enable the Google provider if you want "Continuar com Google".
5. Make yourself an admin after signing up:
   `update public.profiles set role = 'admin' where email = 'you@example.com';`

The seed adds seven demo chefs in Lisbon with no login attached. Delete them before launch.

## End-to-end tests

```bash
npm run test:e2e      # headless; reuses `npm run dev` if it is already running
npm run test:e2e:ui   # Playwright UI, step by step
```

These run with `PAYMENTS_ENABLED` off (the default). Payment records are append-only, so a run that created them could not clean up after itself — exercising the payment flow needs its own disposable Supabase project.

`e2e/booking-lifecycle.spec.ts` plays the whole story in three browsers: a chef creates a profile, uploads photos and applies; an admin approves; the chef publishes an offer and opens a day; a guest books it; the chef accepts, chats, confirms the deposit and completes it; the guest reviews and the review appears on the public page.

It runs against the Supabase project in `.env.local` and needs `SUPABASE_SECRET_KEY`. Setup creates confirmed `e2e-…@aolume.test` accounts with the secret key (signing up through the form would send real confirmation emails), and cleanup deletes every record tied to those accounts, including leftovers of interrupted runs. Set `E2E_KEEP_DATA=1` to keep the data for inspection. Reports land in `e2e/.report`.

## Design

The visual system is documented in [DESIGN.md](DESIGN.md) and the product context in [PRODUCT.md](PRODUCT.md). Photography is temporary Unsplash stock listed in `lib/photos.ts`; replace it with real chefs and dishes before launch. Search results (`/procurar`) show beside a map; the original full-screen home map is parked in `components/map` (`MapExplorer`).

## Project structure

| Path                           | What                                                                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`                         | Routes. Pages are server components; each feature keeps its server actions next to it (`app/actions.ts`, `app/dashboard/actions/` by feature, `app/admin/actions.ts`)                                                        |
| `app/page.tsx`                 | Home: tiled-wall hero with the search, services, how it works, best-rated chefs, chef invitation                                                                                                                             |
| `app/procurar`                 | Search results: chefs filtered by area, service, cuisine and date                                                                                                                                                            |
| `app/chef/[slug]`              | Chef showcase: gallery, about, experience, offers, reviews, booking form                                                                                                                                                     |
| `app/reserva/[id]`             | Booking status, chat, cancel or accept a proposal, review once completed                                                                                                                                                     |
| `app/para-chefs`, `app/entrar` | Marketing page for chefs; sign in (email link, password, Google, chef sign-up)                                                                                                                                               |
| `app/dashboard/*`              | Chef dashboard: overview, requests, logistics, calendar, offers, cooking categories, reviews, profile                                                                                                                        |
| `app/admin`                    | Approval queue, reported reviews, weekly stats                                                                                                                                                                               |
| `components/ui/`               | Design-system primitives: `Field`, `Switch`, `Chip`, `Stepper`, `PageHeader`, `StatGrid`, `DetailList`, `FormMessage`                                                                                                        |
| `components/<feature>/`        | Feature components: `home/`, `search/`, `chef/` (showcase sections), `booking/`, `dashboard/`, `admin/`, `para-chefs/`, `brand/` (azulejo tiles), `map/` (results map; `MapExplorer` parked)                                 |
| `hooks/`                       | Client hooks: `useServerAction`, `useBookingForm`, `useChefFilters`, `useMonthCalendar`, `usePolling`, `usePhotoUpload`, `useMediaQuery`, `useToggleList`, `useProfileForm`, `useDishPhotos`, `useMapLibre`, `useMyLocation` |
| `lib/`                         | Server and shared logic: env, Supabase clients, data access with demo fallbacks (`lib/dashboard/` by domain), formatting, constants                                                                                          |
| `supabase/`                    | Migrations (schema, RLS, functions, storage, cron) and seed data                                                                                                                                                             |

### Conventions

- **Server first.** Pages fetch on the server; client components only handle interaction.
- **Logic in hooks, markup in components.** A component that grows state or rules gets a `use…` hook (e.g. `useBookingForm`); repeated markup becomes a `components/ui` primitive.
- **Server actions are public endpoints.** Each one validates its arguments with zod, returns an `ActionResult` (`{ ok: true } | { ok: false, error }`), never throws to the client, and leaves authorisation to RLS and database functions.
- **Secrets stay on the server.** Public config lives in `lib/env.ts`; secrets in `lib/env.server.ts` (guarded by `server-only`).
- **One commit per feature**, with conventional prefixes (`feat`, `refactor`, `fix`, `chore`, `docs`).
- `npm run lint`, `npm run typecheck` and `npm run format:check` before pushing.

## Payments

The client pays the chef's deposit through the app; the platform keeps a commission on the booking
value and transfers the rest to the chef after the service. The whole design, including the legal
points that need a lawyer's sign-off, is in [docs/specs/pagamentos-marketplace.md](docs/specs/pagamentos-marketplace.md).

**The flow.** Chef accepts → the amounts are frozen on the booking → client pays by MB WAY or
Multibanco reference → EuPago notifies us → booking confirmed → service happens → the money waits
out the hold period → an admin builds a payout batch, downloads a SEPA file, pays at the bank and
records it → each chef gets a payment document.

**Two switches.** `PAYMENTS_ENABLED` in the environment, and `payments_enabled` in
`platform_settings`. Both must be on. With either off the site behaves exactly as it did before:
no payment step, no deposit on a booking, every existing test still passes.

**Setting it up**

1. Fill in the `EUPAGO_*`, `PAYOUT_ENCRYPTION_KEY` and `PLATFORM_IBAN` values from `.env.example`.
   Generate the encryption key with
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and keep a copy:
   without it the stored IBANs are unreadable.
2. In the EuPago backoffice, point **Realtime Webhooks 2.0** at
   `https://<your-domain>/api/payments/eupago/webhook` and copy the signing secret into
   `EUPAGO_WEBHOOK_SECRET`.
3. Run the new migrations (`20261105000001` … `20261105000007`).
4. Schedule the catch-up job, which settles payments whose webhook never arrived:
   `curl -XPOST -H "x-reconcile-secret: $RECONCILE_SECRET" https://<your-domain>/api/payments/reconcile`
   every few minutes.
5. Make yourself an admin and set the commission in `/admin/pagamentos` before switching anything on.

**Why a person is in the loop.** EuPago's payout endpoints are read-only — there is no API that
sends money to a chef's IBAN. The app builds the batch and the bank file; a human uploads it and
confirms. That is also the last check before money leaves the company.

**What protects the money**

- No amount ever comes from the browser: every figure is computed in the database and frozen on
  the booking when the chef accepts.
- A webhook is only a nudge. Whatever it says, and whether or not its signature checks out, the
  state is confirmed by asking EuPago directly before anything moves.
- `payment_events`, `ledger_entries` and `payout_documents` are append-only at the grant _and_
  trigger level. A mistake is corrected with a new row, never an edited one.
- IBANs are encrypted by the application (AES-256-GCM, key outside the database), shown only as
  the last four digits, and decrypted solely while a bank file is being built.
- Changing an IBAN takes a confirmation link, warns the old address, freezes payouts for 72 hours,
  and the first transfer to a new account waits for an admin. This is the attack that actually
  happens to marketplaces.
- Every admin action that touches money needs a written reason and lands in `admin_logs`.

## Security

- Every table has Row Level Security; see the next section for the rules.
- Guests use a magic-link token. The email link carries it once (`/reserva/<id>?t=…`); the proxy moves it into an httpOnly cookie scoped to that booking and redirects to the clean URL.
- Security headers on every response: Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy (`no-referrer` on booking pages) and a permissions policy.
- Uploads go to the chef's own Storage folder, with size and type limits set on the bucket; the server re-checks the path before saving a photo.

## How the database protects data

- Every table has RLS. Public reads cover only approved chefs, their active offers and visible reviews.
- Guests never touch tables directly. `request_booking`, `booking_view`, `client_post_message`, `client_update_booking` and `submit_review` are security-definer functions authorised by a hashed magic-link token.
- `booking_status_guard` enforces the lifecycle (Requested → Accepted / Declined / Change proposed → Confirmed → Completed, cancel any time before completion) and logs every change in `booking_events`.
- Chefs can't approve themselves, set badges or edit ratings (`guard_chef_columns`).
- A chef's public location is snapped to about 100 m. The exact kitchen address lives in `chef_logistics`, which only the chef and admins can read; a pickup client sees it only after the chef accepts.
- pg_cron expires unanswered requests after 48 h and completes confirmed bookings 24 h after the date.

## Maps: why OpenFreeMap and not Mapbox

Mapbox needs an account and an access token. Its free tier covers 50,000 web map loads a month, and above that it bills per load. OpenFreeMap serves the same kind of vector tiles for free, with no key and no limits. MapLibre GL, the open-source fork of Mapbox GL, draws the 3D buildings. If you later want Mapbox styles or its Directions API, set `NEXT_PUBLIC_MAP_STYLE_URL` and change nothing else.

Address search uses Photon, which is free but rate-limited and shared. Before launch, consider self-hosting it or moving to a paid geocoder.

## Not built yet

- English translation (all copy is pt-PT; `next-intl` is planned)
- Realtime chat: the chat polls every 8 s, and the `messages` table is already in the realtime publication
- Email reminders: 24 h before a booking, and the review reminder. The cron jobs exist for expiry and auto-complete only
- Dishes library, promotions, past-bookings showcase on the profile, client favourites
- Share kit (QR code, story images), paid boosts
- Final terms and privacy policy (updated for payments, still to be reviewed by a Portuguese lawyer)
- A certified invoicing provider: the commission invoice to the chef is not issued yet (see the spec)
