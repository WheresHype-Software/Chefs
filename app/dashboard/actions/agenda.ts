"use server";

import { fail, failWith, ok, type ActionResult as Result } from "@/lib/result";
import { chefContext, done, NO_CHEF } from "./context";

/** Cycles a day: nothing -> available -> blocked -> nothing. */
export async function cycleDay(date: string): Promise<Result> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Data inválida");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  const { data } = await ctx.sb.from("availability").select("id, status").eq("chef_id", ctx.chef.id).eq("date", date).maybeSingle();
  const res = !data
    ? await ctx.sb.from("availability").insert({ chef_id: ctx.chef.id, date, status: "available" })
    : data.status === "available"
      ? await ctx.sb.from("availability").update({ status: "blocked" }).eq("id", data.id)
      : await ctx.sb.from("availability").delete().eq("id", data.id);
  return res.error ? failWith(res.error, "cycleDay", "Não foi possível atualizar a agenda. Tente de novo.") : done();
}

/** Marks every given weekday of a month as available. */
export async function openWeekdays(year: number, month: number, weekdays: number[]): Promise<Result> {
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  const rows = [];
  const today = new Date().toISOString().slice(0, 10);
  for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
    const date = new Date(Date.UTC(year, month, d));
    const iso = date.toISOString().slice(0, 10);
    if (iso >= today && weekdays.includes(date.getUTCDay())) rows.push({ chef_id: ctx.chef.id, date: iso, status: "available" });
  }
  const { error } = await ctx.sb.from("availability").upsert(rows, { onConflict: "chef_id,date,start_time", ignoreDuplicates: true });
  return error ? failWith(error, "openWeekdays", "Não foi possível abrir esses dias. Tente de novo.") : done();
}

/** Ticks a confirmed booking off as done on the day (or undoes it). */
export async function markFulfilled(bookingId: string, undo = false): Promise<Result> {
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const { error } = await ctx.sb
    .from("bookings")
    .update({ fulfilled_at: undo ? null : new Date().toISOString() })
    .eq("id", bookingId);
  return error ? failWith(error, "markFulfilled", "Não foi possível atualizar o serviço. Tente de novo.") : done();
}
