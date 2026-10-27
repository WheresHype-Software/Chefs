# Ao Lume

Private chefs and home cooks near you. Clients find chefs on a map, read their showcase, and send a booking request; chefs manage requests, chat, calendar, offers and logistics from a dashboard. Clients pay chefs directly, so the platform takes no payments and no commission.

Built from the project spec ("Private Chef Platform – Project Spec") and the V2 "chef's whites" mockups (Bodoni Moda + Hanken Grotesk, white, black ink, hairlines, square corners).

## Stack

- Next.js 16 (App Router, server actions), TypeScript, Tailwind CSS 4
- Supabase: Postgres + PostGIS, Auth, Storage, pg_cron, Row Level Security
- MapLibre GL + OpenFreeMap tiles (free, no API key) and Photon geocoding (free, OpenStreetMap data)
- Resend for email (optional)

## Run it

```bash
npm install
npm run dev
```

Without Supabase credentials the app runs in **demo mode**: the map, chef pages and booking form use the seed chefs from `lib/mock.ts`, a sent request opens an example booking at `/reserva/demo`, and `/dashboard` shows the chef dashboard with example data. Nothing is saved.

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

## Project structure

| Path                           | What                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/`                         | Routes. Pages are server components; each feature keeps its server actions next to it (`app/actions.ts`, `app/dashboard/actions.ts`, `app/admin/actions.ts`) |
| `app/page.tsx`                 | Home: 3D chef map, filters, card rail and slide-in booking panel, then "how it works"                                                                        |
| `app/chef/[slug]`              | Chef showcase: gallery, about, experience, offers, reviews, booking form                                                                                     |
| `app/reserva/[id]`             | Booking status, chat, cancel or accept a proposal, review once completed                                                                                     |
| `app/para-chefs`, `app/entrar` | Marketing page for chefs; sign in (email link, password, Google, chef sign-up)                                                                               |
| `app/dashboard/*`              | Chef dashboard: overview, requests, logistics, calendar, offers, cooking categories, reviews, profile                                                        |
| `app/admin`                    | Approval queue, reported reviews, weekly stats                                                                                                               |
| `components/ui/`               | Design-system primitives: `Field`, `Switch`, `Chip`, `Stepper`, `PageHeader`, `StatGrid`, `DetailList`, `FormMessage`                                        |
| `components/<feature>/`        | Feature components: `map/`, `booking/`, `dashboard/`, `admin/`, `home/`                                                                                      |
| `hooks/`                       | Client hooks: `useServerAction`, `useBookingForm`, `useChefFilters`, `useMonthCalendar`, `usePolling`, `usePhotoUpload`, `useMediaQuery`, `useToggleList`    |
| `lib/`                         | Server and shared logic: env, Supabase clients, data access with demo fallbacks, formatting, constants                                                       |
| `supabase/`                    | Migrations (schema, RLS, functions, storage, cron) and seed data                                                                                             |

### Conventions

- **Server first.** Pages fetch on the server; client components only handle interaction.
- **Logic in hooks, markup in components.** A component that grows state or rules gets a `use…` hook (e.g. `useBookingForm`); repeated markup becomes a `components/ui` primitive.
- **Server actions are public endpoints.** Each one validates its arguments with zod, returns an `ActionResult` (`{ ok: true } | { ok: false, error }`), never throws to the client, and leaves authorisation to RLS and database functions.
- **Secrets stay on the server.** Public config lives in `lib/env.ts`; secrets in `lib/env.server.ts` (guarded by `server-only`).
- **One commit per feature**, with conventional prefixes (`feat`, `refactor`, `fix`, `chore`, `docs`).
- `npm run lint`, `npm run typecheck` and `npm run format:check` before pushing.

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
- Final terms and privacy policy (placeholders, to be reviewed by a Portuguese lawyer)
