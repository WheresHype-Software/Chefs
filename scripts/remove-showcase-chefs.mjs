// Removes the showcase chefs seeded by supabase/seed-showcase.sql from a live project.
//
// They are the demo profiles with no auth account (profile_id is null). Everything
// hanging off a chef cascades; bookings are "on delete restrict", so if a real visitor
// ever requested one of them the delete is refused instead of eating their request.
//
//   node scripts/remove-showcase-chefs.mjs           # lists what would go, deletes nothing
//   node scripts/remove-showcase-chefs.mjs --apply   # deletes them
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const api = (path, init = {}) =>
  fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
  });

const demo = await api("chefs?profile_id=is.null&select=id,slug,name,status").then((r) => r.json());
if (!Array.isArray(demo)) {
  console.error("Could not read chefs:", demo);
  process.exit(1);
}
if (!demo.length) {
  console.log("No demo chefs left (profile_id is null). Nothing to do.");
  process.exit(0);
}

console.log(`${demo.length} demo chefs:`);
for (const c of demo) console.log(`  ${c.slug.padEnd(22)} ${c.status.padEnd(10)} ${c.name}`);

const ids = demo.map((c) => c.id).join(",");
const bookings = await api(`bookings?chef_id=in.(${ids})&select=id,ref,chef_id,status`).then((r) => r.json());
if (Array.isArray(bookings) && bookings.length) {
  console.log(`\n${bookings.length} bookings point at them — the delete will be refused:`);
  for (const b of bookings) console.log(`  ${b.ref} · ${b.status}`);
  console.log("Decide what to do with those first.");
  process.exit(1);
}

if (!process.argv.includes("--apply")) {
  console.log("\nDry run. Re-run with --apply to delete them.");
  process.exit(0);
}

const res = await api("chefs?profile_id=is.null", { method: "DELETE", headers: { Prefer: "return=representation" } });
const gone = await res.json();
if (!res.ok) {
  console.error(`Delete failed (${res.status}):`, gone);
  process.exit(1);
}

const left = await api("chefs?select=id").then((r) => r.json());
console.log(`\nDeleted ${Array.isArray(gone) ? gone.length : "?"} chefs. ${Array.isArray(left) ? left.length : "?"} chefs remain.`);
