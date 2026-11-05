// Checks every supabase.rpc() call in the app against the function signatures in the migrations.
//
// A wrong parameter name does not fail loudly: PostgREST answers "function does not exist", the
// caller swallows it, and a feature simply never appears. That is how the payment card went
// missing on a booking that had everything else right.
//
//   node scripts/check-rpc.mjs
import fs from "node:fs";
import path from "node:path";

// Every function the migrations define, with its parameter names.
const sqlFiles = fs.readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql"));
const defs = new Map();
for (const f of sqlFiles) {
  const sql = fs.readFileSync(path.join("supabase/migrations", f), "utf8");
  const re = /create (?:or replace )?function\s+public\.(\w+)\s*\(([\s\S]*?)\)\s*returns/g;
  let m;
  while ((m = re.exec(sql))) {
    const params = [...m[2].matchAll(/(^|,)\s*(p_\w+)/g)].map((x) => x[2]);
    defs.set(m[1], params); // later definitions win, as in the database
  }
}

// Every rpc() call in the app, with the keys it passes.
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name.startsWith(".") ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });

let problems = 0;
for (const file of [...walk("app"), ...walk("lib"), ...walk("components")]) {
  const src = fs.readFileSync(file, "utf8");
  const re = /\.rpc\(\s*"(\w+)"\s*(?:,\s*\{([\s\S]*?)\})?\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    const line = src.slice(0, m.index).split("\n").length;
    const expected = defs.get(name);
    if (!expected) {
      console.log(`✖ ${file}:${line}  rpc("${name}") — no such function in the migrations`);
      problems += 1;
      continue;
    }
    const passed = [...(m[2] ?? "").matchAll(/(^|,|\n)\s*(p_\w+)\s*:/g)].map((x) => x[2]);
    const unknown = passed.filter((k) => !expected.includes(k));
    if (unknown.length) {
      console.log(`✖ ${file}:${line}  rpc("${name}") passes ${unknown.join(", ")} — accepts ${expected.join(", ")}`);
      problems += 1;
    }
  }
}
console.log(problems === 0 ? "\nevery rpc call matches its function" : `\n${problems} mismatch(es)`);
process.exit(problems === 0 ? 0 : 1);
