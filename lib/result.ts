import type { ZodError } from "zod";
import type { getTranslator } from "./i18n/translator";
import errorsPt from "@/messages/pt/errors.json";

/** Return shape for every server action: callers branch on `ok`, never on thrown errors. */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** The "errors" translator an action gets from requestTranslator("errors"). */
export type ErrorsT = ReturnType<typeof getTranslator<"errors">>;

/**
 * What people see when something fails that they cannot fix themselves. Portuguese, for the admin
 * area; actions for everyone else pass t("generic") in the visitor's language.
 */
export const GENERIC_ERROR = errorsPt.generic;

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
 * sentence (ending in ".") when the field needs its own explanation — both already translated.
 */
export function failInvalid(error: ZodError, t: ErrorsT, labels: Record<string, string> = {}): ActionResult {
  const field = String(error.issues[0]?.path[0] ?? "");
  const label = labels[field];
  if (!label) return fail(t("form.check"));
  return fail(label.endsWith(".") ? label : t("form.checkField", { label }));
}
