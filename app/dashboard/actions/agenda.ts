"use server";

import { requestTranslator } from "@/lib/i18n/server";
import { fail, failWith, ok, type ActionResult as Result } from "@/lib/result";
import { chefContext, done } from "./context";

/** The chef's weekly days, or none before migration 20261110000002. */
async function weeklyDays(sb: NonNullable<Awaited<ReturnType<typeof chefContext>>["sb"]>, chefId: string): Promise<number[]> {
  const { data, error } = await sb.from("chefs").select("open_weekdays").eq("id", chefId).maybeSingle();
  if (error || !data) return [];
  return ((data as { open_weekdays: number[] | null }).open_weekdays ?? []).map(Number);
}

/**
 * Opens or closes one day. A day's row is only the exception to the weekly days: opening a day
 * that isn't one of them saves it as an extra day, closing one of them saves it as a day off, and
 * putting a day back to what its weekday says removes the row.
 */
export async function setDay(date: string, open: boolean): Promise<Result> {
  const t = await requestTranslator("errors");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(t("dashboard.agenda.invalidDate"));
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  const id = ctx.chef.id;
  const weekly = (await weeklyDays(ctx.sb, id)).includes(new Date(`${date}T00:00:00Z`).getUTCDay());
  const cleared = await ctx.sb.from("availability").delete().eq("chef_id", id).eq("date", date);
  if (cleared.error) return failWith(cleared.error, "setDay", t("dashboard.agenda.dayFailed"));
  if (open !== weekly) {
    const { error } = await ctx.sb.from("availability").insert({ chef_id: id, date, status: open ? "available" : "blocked" });
    if (error) return failWith(error, "setDay", t("dashboard.agenda.dayFailed"));
  }
  return done();
}

/** Saves the days open every week (0 = Sunday … 6 = Saturday). */
export async function setWeeklyDays(days: number[]): Promise<Result> {
  const t = await requestTranslator("errors");
  const clean = [...new Set(days)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  const { error } = await ctx.sb.from("chefs").update({ open_weekdays: clean }).eq("id", ctx.chef.id);
  return error ? failWith(error, "setWeeklyDays", t("dashboard.agenda.weeklyFailed")) : done();
}

/** Marks every given weekday of a month as available. */
export async function openWeekdays(year: number, month: number, weekdays: number[]): Promise<Result> {
  const t = await requestTranslator("errors");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  const rows = [];
  const today = new Date().toISOString().slice(0, 10);
  for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
    const date = new Date(Date.UTC(year, month, d));
    const iso = date.toISOString().slice(0, 10);
    if (iso >= today && weekdays.includes(date.getUTCDay())) rows.push({ chef_id: ctx.chef.id, date: iso, status: "available" });
  }
  const { error } = await ctx.sb.from("availability").upsert(rows, { onConflict: "chef_id,date,start_time", ignoreDuplicates: true });
  return error ? failWith(error, "openWeekdays", t("dashboard.agenda.openFailed")) : done();
}

/** Ticks a confirmed booking off as done on the day (or undoes it). */
export async function markFulfilled(bookingId: string, undo = false): Promise<Result> {
  const t = await requestTranslator("errors");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const { error } = await ctx.sb
    .from("bookings")
    .update({ fulfilled_at: undo ? null : new Date().toISOString() })
    .eq("id", bookingId);
  return error ? failWith(error, "markFulfilled", t("dashboard.agenda.fulfilledFailed")) : done();
}
