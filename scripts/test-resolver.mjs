// Lets `node --test` read the app's own modules without changing how the app imports them.
//
// Next resolves "./money" and "@/lib/money" through its bundler; plain Node does not. Rather than
// spell out ".ts" in the source (which would read oddly next to every other import in the repo),
// the test runner teaches Node the same two rules.
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONS = [".ts", ".mts", ".tsx"];

function firstThatExists(base) {
  // An exact path (e.g. "@/messages/en/enums.json"): Node resolves "@/…" as a package otherwise.
  if (/\.\w+$/.test(base) && existsSync(base)) return base;
  for (const ext of EXTENSIONS) if (existsSync(base + ext)) return base + ext;
  for (const ext of EXTENSIONS) if (existsSync(`${base}/index${ext}`)) return `${base}/index${ext}`;
  return null;
}

// A .json file imported without `with { type: "json" }` (as the app's bundler allows): Node needs
// the attribute, so the resolve hook adds it.
function resolved(found, context) {
  const out = { url: pathToFileURL(found).href, shortCircuit: true };
  if (found.endsWith(".json")) out.importAttributes = { ...context.importAttributes, type: "json" };
  return out;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // "@/lib/money" -> <root>/lib/money.ts
    if (specifier.startsWith("@/")) {
      const found = firstThatExists(resolvePath(root, specifier.slice(2)));
      if (found) return resolved(found, context);
    }
    // "./money" -> ./money.ts, next to the importing file
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
      const found = firstThatExists(base);
      if (found) return resolved(found, context);
    }
    return nextResolve(specifier, context);
  },
});
