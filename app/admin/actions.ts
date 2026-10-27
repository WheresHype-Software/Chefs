"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/dashboard";
import { sendEmail, siteUrl } from "@/lib/email";
import { z } from "zod";
import { fail, failWith, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

type Decision = "approved" | "rejected" | "suspended";

/** RLS already blocks non-admins; this check fails fast with a clear message. */
async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return !session.demo && session.role === "admin";
}

const ReviewInput = z.object({
  chefId: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "suspended"]),
  note: z.string().trim().max(1000),
  badges: z.array(z.enum(["identity", "portfolio", "certified", "founder"])).max(4),
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
