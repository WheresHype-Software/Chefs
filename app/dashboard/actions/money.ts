"use server";

import { z } from "zod";
import { requestTranslator } from "@/lib/i18n/server";
import { fail, failWith, ok, type ActionResult } from "@/lib/result";
import { chefContext, done } from "./context";

/**
 * The chef's own bookkeeping on a booking: the part of the price that is paid directly to them,
 * outside the platform. It is not our money and never touches the ledger — it is the chef noting,
 * on their own page, that the client settled up.
 */
const RestPaid = z.object({
  bookingId: z.string().uuid(),
  paid: z.boolean(),
  amount: z.number().finite().min(0).max(1000000).optional(),
});

export async function setRestPaid(input: z.infer<typeof RestPaid>): Promise<ActionResult> {
  const t = await requestTranslator("errors");
  const parsed = RestPaid.safeParse(input);
  if (!parsed.success) return fail(t("invalidRequest"));
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));

  const { error } = await ctx.sb.rpc("chef_set_rest_paid", {
    p_booking: parsed.data.bookingId,
    p_paid: parsed.data.paid,
    p_amount: parsed.data.amount ?? null,
  });
  if (error) {
    if (error.message.includes("booking_not_confirmed")) return fail(t("dashboard.money.onlyConfirmed"));
    if (error.message.includes("not_allowed")) return fail(t("dashboard.money.notYours"));
    return failWith(error, "setRestPaid", t("dashboard.saveFailed"));
  }
  return done(`/dashboard/pedidos/${parsed.data.bookingId}`);
}
