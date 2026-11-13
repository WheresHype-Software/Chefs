"use server";

import { getSession } from "@/lib/dashboard";
import { requestTranslator } from "@/lib/i18n/server";
import { fail, failWith, ok, type ActionResult as Result } from "@/lib/result";
import { chefContext, done } from "./context";

export async function replyToReview(reviewId: string, reply: string): Promise<Result> {
  const t = await requestTranslator("errors");
  if (!reply.trim()) return fail(t("dashboard.reviews.replyRequired"));
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const { error } = await ctx.sb.rpc("reply_to_review", { p_review_id: reviewId, p_reply: reply });
  return error ? failWith(error, "replyToReview", t("dashboard.reviews.replyFailed")) : done();
}

export async function reportReview(reviewId: string, reason: string): Promise<Result> {
  const t = await requestTranslator("errors");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  const session = await getSession();
  const { error } = await ctx.sb
    .from("reports")
    .insert({ reporter: session.userId, target_type: "review", target_id: reviewId, reason: reason.slice(0, 1000) });
  return error ? failWith(error, "reportReview", t("dashboard.reviews.reportFailed")) : done();
}
