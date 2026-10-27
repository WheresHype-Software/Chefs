/** Return shape for every server action: callers branch on `ok`, never on thrown errors. */
export type ActionResult = { ok: true } | { ok: false; error: string };

export const ok = (): ActionResult => ({ ok: true });
export const fail = (error: string): ActionResult => ({ ok: false, error });
