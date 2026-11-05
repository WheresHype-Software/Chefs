"use server";

import { revalidatePath } from "next/cache";
import { BADGES } from "@/lib/constants";
import { getSession } from "@/lib/dashboard";
import { sendEmail, siteUrl } from "@/lib/email";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/result";
import { removeSelfies } from "@/lib/selfie";
import { createClient } from "@/lib/supabase/server";
import type { AdminDecision as Decision } from "@/lib/types";

/** RLS already blocks non-admins; this check fails fast with a clear message. */
async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return !session.demo && session.role === "admin";
}

const ReviewInput = z.object({
  chefId: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "suspended"]),
  note: z.string().trim().max(1000),
  badges: z.array(z.enum(BADGES)).max(BADGES.length),
});

const EMAIL: Record<Decision, { subject: string; body: (name: string, slug: string, note: string) => string }> = {
  approved: {
    subject: "O seu perfil Ao Lume foi aprovado",
    body: (name, slug, note) =>
      `Olá ${name},\n\nO seu perfil já está publicado: ${siteUrl(`/chef/${slug}`)}\nPartilhe o link na bio do Instagram.${note ? `\n\n${note}` : ""}\n\nAo Lume`,
  },
  rejected: {
    subject: "O seu perfil Ao Lume precisa de alterações",
    body: (name, _slug, note) =>
      `Olá ${name},\n\nRevimos o seu perfil e precisamos de algumas alterações:\n${note}\n\nAtualize em ${siteUrl("/dashboard/perfil")} e volte a enviar.\n\nAo Lume`,
  },
  suspended: {
    subject: "O seu perfil Ao Lume foi suspenso",
    body: (name, _slug, note) =>
      `Olá ${name},\n\nO seu perfil deixou de estar visível no Ao Lume.\nMotivo: ${note}\n\nSe tiver dúvidas, responda a este email.\n\nAo Lume`,
  },
};

export async function reviewChef(chefId: string, decision: Decision, note: string, badges: string[]): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Sem permissão.");
  const input = ReviewInput.safeParse({ chefId, decision, note, badges });
  if (!input.success) return fail("Pedido inválido. Atualize a página e tente de novo.");
  if (decision !== "approved" && !input.data.note) return fail("Escreva o motivo: o chef recebe-o por email.");
  const sb = await createClient();
  const { error } = await sb.rpc("admin_review_chef", {
    p_chef_id: chefId,
    p_status: decision,
    p_note: input.data.note || null,
    p_badges: input.data.badges,
  });
  if (error) return failWith(error, "reviewChef", "Não foi possível guardar a decisão. Tente de novo.");
  // Once the face is confirmed the selfie has done its job: it is not kept.
  if (decision === "approved") {
    try {
      await removeSelfies(sb, chefId);
    } catch (err) {
      console.error("[action] reviewChef selfie:", err);
    }
  }

  // The decision is saved; a failed email must not undo it or show as an error.
  try {
    const { data } = await sb.from("chefs").select("display_name, slug, profiles(email)").eq("id", chefId).single();
    const email = (data?.profiles as unknown as { email: string } | null)?.email;
    if (email && data) {
      const tpl = EMAIL[decision];
      await sendEmail({ to: email, subject: tpl.subject, text: tpl.body(data.display_name, data.slug, input.data.note) });
    }
  } catch (err) {
    console.error("[action] reviewChef email:", err);
  }
  // No revalidatePath("/admin"): re-rendering would drop the card before DecisionCard folds it into
  // its confirmation. The queue and stats catch up on the next visit.
  return ok();
}

const Visibility = z.object({
  chefId: z.string().uuid(),
  hidden: z.boolean(),
  note: z.string().trim().max(500),
});

/**
 * Takes a chef off the site, or puts them back.
 *
 * Separate from reviewChef on purpose: that one carries the badges from the approval card, and
 * calling it from a list — where the badges are not on screen — would quietly wipe a chef's
 * verified title. Here the badges are left exactly as they are.
 *
 * Hiding needs a reason, because the chef is told what it was.
 */
export async function setChefVisibility(chefId: string, hidden: boolean, note: string): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Sem permissão.");
  const input = Visibility.safeParse({ chefId, hidden, note });
  if (!input.success) return fail("Pedido inválido. Atualize a página e tente de novo.");
  if (hidden && input.data.note.length < 3) return fail("Escreva o motivo: o chef recebe-o por email.");

  const sb = await createClient();
  const { error } = await sb.rpc("admin_review_chef", {
    p_chef_id: chefId,
    p_status: hidden ? "suspended" : "approved",
    p_note: input.data.note || null,
    p_badges: null, // leave the chef's badges alone
  });
  if (error) return failWith(error, "setChefVisibility", "Não foi possível guardar. Tente de novo.");

  // Saved. A failed email must not look like a failed decision.
  try {
    const { data } = await sb.from("chefs").select("display_name, slug, profiles(email)").eq("id", chefId).single();
    const email = (data?.profiles as unknown as { email: string } | null)?.email;
    if (email && data) {
      const tpl = EMAIL[hidden ? "suspended" : "approved"];
      await sendEmail({ to: email, subject: tpl.subject, text: tpl.body(data.display_name, data.slug, input.data.note) });
    }
  } catch (err) {
    console.error("[action] setChefVisibility email:", err);
  }

  revalidatePath("/admin");
  return ok();
}

export async function moderateReview(reviewId: string, reportId: string, action: "keep" | "hide" | "delete"): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Sem permissão.");
  if (!z.string().uuid().safeParse(reviewId).success || !z.string().uuid().safeParse(reportId).success) return fail("Pedido inválido.");
  const sb = await createClient();
  const change =
    action === "hide"
      ? await sb.from("reviews").update({ status: "hidden" }).eq("id", reviewId)
      : action === "delete"
        ? await sb.from("reviews").delete().eq("id", reviewId)
        : null;
  if (change?.error) return failWith(change.error, "moderateReview", "Não foi possível alterar a avaliação. Tente de novo.");
  const { error } = await sb
    .from("reports")
    .update({ status: action === "keep" ? "dismissed" : "resolved" })
    .eq("id", reportId);
  if (error) return failWith(error, "moderateReview report", "Não foi possível fechar a denúncia. Tente de novo.");
  const {
    data: { user },
  } = await sb.auth.getUser();
  await sb.from("admin_logs").insert({ admin_id: user?.id, action: `review_${action}`, target: reviewId });
  revalidatePath("/admin");
  return ok();
}

/**
 * Grants the "Chef" title: adds the admin-only "certified" badge (the chef keeps their status and
 * other badges), marks their certificates verified and tells them by email.
 */
export async function verifyChefTitle(chefId: string): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Sem permissão.");
  if (!z.string().uuid().safeParse(chefId).success) return fail("Pedido inválido.");
  const sb = await createClient();
  const { data: chef } = await sb.from("chefs").select("status, badges, display_name, profiles(email)").eq("id", chefId).single();
  if (!chef) return fail("Chef não encontrado.");
  const { error } = await sb.rpc("admin_review_chef", {
    p_chef_id: chefId,
    p_status: chef.status,
    p_note: null,
    p_badges: [...new Set([...(chef.badges as string[]), "certified"])],
  });
  if (error) return failWith(error, "verifyChefTitle", "Não foi possível verificar o chef. Tente de novo.");
  await sb.from("chef_certifications").update({ verified: true }).eq("chef_id", chefId);

  try {
    const email = (chef.profiles as unknown as { email: string } | null)?.email;
    if (email) {
      await sendEmail({
        to: email,
        subject: "Já aparece como Chef no Ao Lume",
        text: `Olá ${chef.display_name},\n\nVerificámos o seu certificado. A partir de agora aparece aos clientes como Chef ${chef.display_name}, com a marca «Chef verificado».\n\nAo Lume`,
      });
    }
  } catch (err) {
    console.error("[action] verifyChefTitle email:", err);
  }
  return ok();
}

/**
 * Approves several complete applications at once, with the identity and portfolio badges (never
 * "certified": the Chef title is always checked one by one). Each chef gets the usual email.
 */
export async function approveChefs(chefIds: string[]): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Sem permissão.");
  const ids = z.array(z.string().uuid()).min(1).max(50).safeParse(chefIds);
  if (!ids.success) return fail("Pedido inválido.");
  let approved = 0;
  for (const id of ids.data) {
    const r = await reviewChef(id, "approved", "", ["identity", "portfolio"]);
    if (r.ok) approved++;
  }
  revalidatePath("/admin");
  return approved === ids.data.length ? ok() : fail(`Aprovados ${approved} de ${ids.data.length}. Atualize a página e veja os restantes.`);
}

const TitleRefusal = z.object({ chefId: z.string().uuid(), reason: z.string().trim().min(3).max(800) });

/**
 * Refuses a request for the Chef title: the certificates are removed (so the chef can send a
 * better one), the chef gets the reason by email, and the decision is logged.
 */
export async function refuseChefTitle(chefId: string, reason: string): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Sem permissão.");
  const input = TitleRefusal.safeParse({ chefId, reason });
  if (!input.success) return fail("Escreva o motivo: o chef recebe-o por email.");
  const sb = await createClient();
  const { data: chef } = await sb.from("chefs").select("display_name, profiles(email)").eq("id", chefId).single();
  if (!chef) return fail("Chef não encontrado.");
  const { error } = await sb.from("chef_certifications").delete().eq("chef_id", chefId).eq("verified", false);
  if (error) return failWith(error, "refuseChefTitle", "Não foi possível recusar o pedido. Tente de novo.");
  const {
    data: { user },
  } = await sb.auth.getUser();
  await sb
    .from("admin_logs")
    .insert({ admin_id: user?.id, action: "chef_title_refused", target: chefId, details: { reason: input.data.reason } });

  try {
    const email = (chef.profiles as unknown as { email: string } | null)?.email;
    if (email) {
      await sendEmail({
        to: email,
        subject: "O seu certificado no Ao Lume",
        text: `Olá ${chef.display_name},\n\nNão conseguimos verificar o certificado que enviou:\n${input.data.reason}\n\nPode enviar outro em ${siteUrl("/dashboard/perfil")}.\n\nAo Lume`,
      });
    }
  } catch (err) {
    console.error("[action] refuseChefTitle email:", err);
  }
  return ok();
}
