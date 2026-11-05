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
  for (const ext of EXTENSIONS) if (existsSync(base + ext)) return base + ext;
  for (const ext of EXTENSIONS) if (existsSync(`${base}/index${ext}`)) return `${base}/index${ext}`;
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // "@/lib/money" -> <root>/lib/money.ts
    if (specifier.startsWith("@/")) {
      const found = firstThatExists(resolvePath(root, specifier.slice(2)));
      if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
    }
    // "./money" -> ./money.ts, next to the importing file
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
      const found = firstThatExists(base);
      if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
