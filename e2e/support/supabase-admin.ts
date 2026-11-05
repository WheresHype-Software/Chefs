import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SECRET_KEY, SUPABASE_URL } from "./env";
import { E2E_EMAIL_DOMAIN, E2E_PREFIX } from "./run";

let client: SupabaseClient | null = null;

/** Secret-key client for test setup and cleanup only; the tests themselves go through the UI. */
function admin() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("E2E tests need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.");
  }
  client ??= createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

const isTestEmail = (email: string | undefined) => Boolean(email?.startsWith(`${E2E_PREFIX}-`) && email.endsWith(`@${E2E_EMAIL_DOMAIN}`));

/** Unwraps a Supabase result, failing the run with the step that broke. */
function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error || result.data === null) throw new Error(`${what}: ${result.error?.message ?? "no data"}`);
  return result.data;
}

/** For deletes and updates, which return no rows. */
function check(result: { error: { message: string } | null }, what: string) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
}

/**
 * Creates a confirmed account, as if the person had clicked the email link. Signing up through
 * the form would make Supabase send real confirmation emails to addresses that bounce.
 */
export async function createUser(email: string, password: string, meta: { name: string; role: "chef" | "client" }) {
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (error || !data.user) throw new Error(`createUser: ${error?.message ?? "no user"}`);
  return data.user.id;
}

/** There is no UI to become admin (README: set the role in SQL), so the test does the same. */
export async function makeAdmin(userId: string) {
  check(await admin().from("profiles").update({ role: "admin" }).eq("id", userId), "makeAdmin");
}

/** Time travel for the test: the booking's service day becomes today, so it can be completed. */
export async function moveBookingToToday(bookingId: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
  check(await admin().from("bookings").update({ date: today }).eq("id", bookingId), "moveBookingToToday");
}

async function testUserIds() {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const { users } = data;
    ids.push(...users.filter((u) => isTestEmail(u.email)).map((u) => u.id));
    if (users.length < 1000) return ids;
  }
}

/**
 * Removes everything E2E runs created: this run's records and any left by a crashed run.
 * Only touches rows tied to e2e-…@aolume.test accounts or e2e-chef-… slugs.
 *
 * Note: payments, the ledger and payment documents are append-only by design — the database
 * refuses to delete them, even with the secret key — and bookings cannot be deleted while a
 * payment points at them. So these tests must run with PAYMENTS_ENABLED off (the default), where
 * no such rows are created. Testing the payment flow needs its own disposable project.
 */
export async function cleanupTestData() {
  const sb = admin();
  const userIds = await testUserIds();
  const ids = (rows: { id: string }[] | null) => (rows ?? []).map((r) => r.id);

  const chefIds = ids(
    must(await sb.from("chefs").select("id").like("slug", `${E2E_PREFIX}-chef-%`), "find chefs").concat(
      userIds.length ? must(await sb.from("chefs").select("id").in("profile_id", userIds), "find chefs by owner") : [],
    ),
  );
  const clientIds = ids(must(await sb.from("clients").select("id").like("email", `${E2E_PREFIX}-%@${E2E_EMAIL_DOMAIN}`), "find clients"));

  // Bookings block deleting their chef or client; everything else cascades from those rows.
  if (chefIds.length) check(await sb.from("bookings").delete().in("chef_id", chefIds), "delete chef bookings");
  if (clientIds.length) check(await sb.from("bookings").delete().in("client_id", clientIds), "delete client bookings");
  if (clientIds.length) check(await sb.from("clients").delete().in("id", clientIds), "delete clients");
  if (chefIds.length) check(await sb.from("chefs").delete().in("id", chefIds), "delete chefs");

  for (const userId of userIds) {
    for (const bucket of ["chef-photos", "chef-docs"]) {
      const files = must(await sb.storage.from(bucket).list(userId, { limit: 100 }), `list ${bucket}`);
      if (files.length) check(await sb.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`)), `delete ${bucket}`);
    }
    check(await sb.from("admin_logs").delete().eq("admin_id", userId), "delete admin logs");
    check(await sb.auth.admin.deleteUser(userId), "delete user");
  }
}
