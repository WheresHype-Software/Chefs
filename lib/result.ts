import type { ZodError } from "zod";

/** Return shape for every server action: callers branch on `ok`, never on thrown errors. */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** What people see when something fails that they cannot fix themselves. */
export const GENERIC_ERROR = "Algo correu mal. Tente de novo dentro de momentos.";

export const ok = (): ActionResult => ({ ok: true });
export const fail = (error: string): ActionResult => ({ ok: false, error });

/**
 * A database or service error: the details go to the server log, the person gets a plain message.
 * Never pass error.message to people; it can leak table names, constraints or SQL.
 */
export function failWith(error: unknown, context: string, message = GENERIC_ERROR): ActionResult {
  console.error(`[action] ${context}:`, error);
  return fail(message);
}

/**
 * Invalid form input, named by field. `labels` maps a field to its form label, or to a full
 * sentence (ending in ".") when the field needs its own explanation.
 */
export function failInvalid(error: ZodError, labels: Record<string, string> = {}): ActionResult {
  const field = String(error.issues[0]?.path[0] ?? "");
  const label = labels[field];
  if (!label) return fail("Verifique os dados do formulário.");
  return fail(label.endsWith(".") ? label : `Verifique o campo «${label}».`);
}
