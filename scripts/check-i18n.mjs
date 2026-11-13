// Checks the translations: every key in messages/pt exists in messages/en and vice versa, with the
// same {placeholders}. With --scan, also lists Portuguese text still hard-coded in the site's code.
// Usage: node scripts/check-i18n.mjs [--scan] [paths…]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const SOURCE = "pt";
const TARGETS = ["en"];

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

function load(locale) {
  const dir = join(root, "messages", locale);
  const all = {};
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const ns = f.replace(/\.json$/, "");
    Object.assign(all, flatten(JSON.parse(readFileSync(join(dir, f), "utf8")), ns));
  }
  return all;
}

/** Top-level ICU arguments: {name}, {count, plural, …}, {gender, select, …}; and rich tags <b>. */
function args(msg) {
  const names = new Set();
  let depth = 0;
  for (let i = 0; i < msg.length; i++) {
    const c = msg[i];
    if (c === "'" && msg[i + 1] === "{") { i = msg.indexOf("'", i + 1); if (i < 0) break; continue; }
    if (c === "{") {
      if (depth === 0) { const m = /^\{\s*([A-Za-z_]\w*)/.exec(msg.slice(i)); if (m) names.add(m[1]); }
      depth++;
    } else if (c === "}") depth--;
  }
  for (const m of msg.matchAll(/<([a-zA-Z]\w*)>/g)) names.add(`<${m[1]}>`);
  return [...names].sort().join(",");
}

let errors = 0;
let warnings = 0;
const source = load(SOURCE);
for (const locale of TARGETS) {
  const target = load(locale);
  for (const key of Object.keys(source)) {
    if (!(key in target)) { console.error(`✗ ${locale}: missing ${key}`); errors++; continue; }
    if (args(source[key]) !== args(target[key])) {
      console.error(`✗ ${locale}: ${key} has {${args(target[key])}}, ${SOURCE} has {${args(source[key])}}`);
      errors++;
    }
    const words = source[key].trim().split(/\s+/).length;
    if (words >= 4 && source[key] === target[key]) { console.warn(`! ${locale}: ${key} is the same as ${SOURCE} (not translated?)`); warnings++; }
  }
  for (const key of Object.keys(target)) if (!(key in source)) { console.error(`✗ ${locale}: extra key ${key} (not in ${SOURCE})`); errors++; }
}

if (process.argv.includes("--scan")) {
  // Portuguese still in code: string literals or JSX text with Portuguese accents. A heuristic: it
  // misses unaccented Portuguese and flags comments-in-strings, so read the list, do not trust it.
  const paths = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const roots = paths.length ? paths : ["app", "components", "lib", "hooks"];
  const skip = /(^|\/)(admin|node_modules|\.next)(\/|$)|\.test\.|lib\/i18n\//;
  const accent = /[ãáàâçéêíóôõúÁÉÍÓÚÃÕÇ]/;
  const files = [];
  const walk = (p) => {
    const st = statSync(p);
    if (st.isDirectory()) for (const f of readdirSync(p)) walk(join(p, f));
    else if (/\.(tsx?|mts)$/.test(p) && !skip.test(relative(root, p))) files.push(p);
  };
  for (const r of roots) walk(join(root, r));
  let total = 0;
  for (const f of files) {
    const lines = readFileSync(f, "utf8").split("\n");
    const hits = [];
    lines.forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return;
      const code = line.replace(/\/\/.*$/, "");
      const literals = code.match(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g) ?? [];
      const jsxText = code.match(/>[^<>{}]+</g) ?? [];
      if ([...literals, ...jsxText].some((s) => accent.test(s))) hits.push(i + 1);
    });
    if (hits.length) { console.log(`${relative(root, f)}: ${hits.length} (lines ${hits.slice(0, 12).join(", ")}${hits.length > 12 ? ", …" : ""})`); total += hits.length; }
  }
  console.log(`\n${total} lines with Portuguese text left in ${files.length} files scanned.`);
}

console.log(`${Object.keys(source).length} keys · ${errors} errors · ${warnings} warnings`);
process.exit(errors ? 1 : 0);
