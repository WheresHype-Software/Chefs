// Structural check on the migrations, for when there is no Postgres to hand.
//
// Catches the two ways generated SQL breaks in practice: a dollar-quote that lost a character,
// and a function body that never closes (which silently swallows everything after it). A patch
// script using String.replace() does exactly this, because "$$" in a replacement string is an
// escape that collapses to a single "$" — which is how a whole migration once shipped broken.
//
//   node scripts/check-sql.mjs supabase/migrations/*.sql
import fs from "node:fs";

// npm passes the pattern quoted, so expand it here rather than relying on the shell.
const files = process.argv.slice(2).flatMap((arg) => (arg.includes("*") ? [...fs.globSync(arg)].sort() : [arg]));
if (!files.length) {
  console.error("usage: node scripts/check-sql.mjs <file.sql> [...]");
  process.exit(2);
}

let problems = 0;

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  // Comments first, block ones included: an apostrophe in "the chef's confirmation" would
  // otherwise read as the start of a string and swallow the rest of the file.
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n")
    .replace(/'(?:[^']|'')*'/g, "''");

  const markers = (code.match(/\$\$/g) ?? []).length;
  const functions = (code.match(/create (or replace )?function/g) ?? []).length;
  const crons = (code.match(/cron\.schedule/g) ?? []).length;
  const doBlocks = (code.match(/\bdo\s*\$\$/g) ?? []).length;
  const expected = (functions + crons + doBlocks) * 2;

  const issues = [];
  if (markers % 2 !== 0) issues.push(`${markers} dollar-quote markers: a body never closes`);
  else if (markers !== expected) {
    issues.push(`${functions} functions + ${crons} cron + ${doBlocks} do-blocks want ${expected} markers, found ${markers}`);
  }

  raw.split("\n").forEach((line, i) => {
    const bare = line.replace(/--.*$/, "").replace(/'(?:[^']|'')*'/g, "''");
    if ((bare.match(/\$/g) ?? []).length % 2 === 1) issues.push(`line ${i + 1}: stray $ → ${line.trim().slice(0, 80)}`);
  });

  if (issues.length) {
    problems += issues.length;
    console.log(`✖ ${file}`);
    for (const issue of issues) console.log(`    ${issue}`);
  } else {
    console.log(`✓ ${file}  (${functions} functions, ${crons} cron, ${doBlocks} do-blocks)`);
  }
}

console.log(problems === 0 ? "\nall structurally sound" : `\n${problems} problem(s)`);
process.exit(problems === 0 ? 0 : 1);
