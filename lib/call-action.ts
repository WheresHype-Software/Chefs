import errorsEn from "@/messages/en/errors.json";
import errorsPt from "@/messages/pt/errors.json";

type Failure = { ok: false; error: string };

/** The page's language from <html lang> ("pt-PT", "en-GB"): this runs outside React, without hooks. */
function pageErrors(): { generic: string; offline: string } {
  const lang = typeof document !== "undefined" ? document.documentElement.lang.toLowerCase() : "";
  return lang.startsWith("en") ? errorsEn : errorsPt;
}

/**
 * Calls a server action from the browser. Actions return failures as values, but a dropped
 * connection or a crashed server throws; this turns those into the same plain failure, so a
 * click never ends in an error screen.
 */
export async function callAction<T extends { ok: boolean }>(action: () => Promise<T>): Promise<T | Failure> {
  try {
    return await action();
  } catch (err) {
    console.error("[action]", err);
    const e = pageErrors();
    return { ok: false, error: typeof navigator !== "undefined" && !navigator.onLine ? e.offline : e.generic };
  }
}
