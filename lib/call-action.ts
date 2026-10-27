import { GENERIC_ERROR } from "./result";

const OFFLINE = "Sem ligação à internet. Verifique a ligação e tente de novo.";

type Failure = { ok: false; error: string };

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
    return { ok: false, error: typeof navigator !== "undefined" && !navigator.onLine ? OFFLINE : GENERIC_ERROR };
  }
}
