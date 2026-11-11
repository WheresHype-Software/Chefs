"use server";

import { revalidatePath } from "next/cache";
import { BADGES } from "@/lib/constants";
import { getSession } from "@/lib/dashboard";
import { sendEmail, siteUrl } from "@/lib/email";
import { renderEmail, type EmailDoc } from "@/lib/email-template";
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

/** A decisão da equipa, no mesmo desenho de todos os outros emails. */
const EMAIL: Record<Decision, { subject: string; doc: (name: string, slug: string, note: string) => EmailDoc }> = {
  approved: {
    subject: "O seu perfil Ao Lume foi aprovado",
    doc: (name, slug, note) => ({
      preheader: "A sua página já está pública.",
      heading: "O seu perfil está publicado",
      lead: `Olá ${name}. A partir de agora aparece nas pesquisas da sua zona e pode receber pedidos.`,
      paragraphs: [
        `Ponha a ligação na bio do Instagram: é mais fácil de partilhar do que um formulário, e já leva consigo os menus, os preços e as avaliações.`,
        ...(note ? [note] : []),
      ],
      cta: { label: "Ver a minha página", href: siteUrl(`/chef/${slug}`) },
    }),
  },
  rejected: {
    subject: "O seu perfil Ao Lume precisa de alterações",
    doc: (name, _slug, note) => ({
      preheader: "Faltam alguns acertos antes de publicarmos.",
      heading: "Precisamos de algumas alterações",
      lead: `Olá ${name}. Revimos o seu perfil e falta pouco.`,
      paragraphs: [note, "Depois de atualizar, volte a enviar para revisão. Respondemos normalmente no mesmo dia útil."],
      cta: { label: "Atualizar o perfil", href: siteUrl("/dashboard/comecar") },
    }),
  },
  suspended: {
    subject: "O seu perfil Ao Lume foi suspenso",
    doc: (name, _slug, note) => ({
      preheader: "A sua página deixou de estar visível.",
      heading: "O seu perfil deixou de estar visível",
      lead: `Olá ${name}.`,
      facts: [["Motivo", note]],
      paragraphs: ["As reservas que já tinha mantêm-se. Se achar que há um engano, responda a este email e vemos outra vez."],
    }),
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
      const rendered = renderEmail(tpl.doc(data.display_name, data.slug, input.data.note));
      await sendEmail({ to: email, subject: tpl.subject, text: rendered.text, html: rendered.html });
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
      const rendered = renderEmail(tpl.doc(data.display_name, data.slug, input.data.note));
      await sendEmail({ to: email, subject: tpl.subject, text: rendered.text, html: rendered.html });
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
  const { data: chef } = await sb.from("chefs").select("status, badges, display_name, slug, profiles(email)").eq("id", chefId).single();
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
      const doc = renderEmail({
        preheader: "O seu título de Chef foi confirmado.",
        heading: `Já aparece como Chef ${chef.display_name}`,
        lead: `Olá ${chef.display_name}. Confirmámos o seu pedido de título de Chef.`,
        paragraphs: [
          "A partir de agora aparece aos clientes como Chef, com o selo «Chef verificado» ao lado do nome em todas as pesquisas.",
        ],
        cta: { label: "Ver a minha página", href: siteUrl(`/chef/${chef.slug}`) },
      });
      await sendEmail({ to: email, subject: "Já aparece como Chef no Ao Lume", text: doc.text, html: doc.html });
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

const BadgesInput = z.object({
  chefId: z.string().uuid(),
  badges: z.array(z.enum(BADGES)).max(BADGES.length),
});

/**
 * Sets the team's badges on a chef already decided on: the Chef title ("certified"), Fundador,
 * and the identity and portfolio checks. Status stays as it is, and so do badges the chef chose
 * themselves ("cozinheira"). Logged in admin_logs by the RPC. No email: this is a correction or a
 * reward the team hands out, not a decision the chef waits for.
 */
export async function setChefBadges(chefId: string, badges: string[]): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Sem permissão.");
  const input = BadgesInput.safeParse({ chefId, badges });
  if (!input.success) return fail("Pedido inválido. Atualize a página e tente de novo.");
  const sb = await createClient();
  const { data: chef } = await sb.from("chefs").select("status, badges, slug").eq("id", chefId).single();
  if (!chef) return fail("Chef não encontrado.");
  const own = (chef.badges as string[]).filter((b) => !(BADGES as readonly string[]).includes(b));
  const { error } = await sb.rpc("admin_review_chef", {
    p_chef_id: chefId,
    p_status: chef.status,
    p_note: null,
    p_badges: [...new Set([...own, ...input.data.badges])],
  });
  if (error) return failWith(error, "setChefBadges", "Não foi possível guardar os selos. Tente de novo.");
  // Granting the title by hand also settles any certificate still waiting in «Títulos de Chef».
  if (input.data.badges.includes("certified") && !(chef.badges as string[]).includes("certified")) {
    await sb.from("chef_certifications").update({ verified: true }).eq("chef_id", chefId);
  }
  revalidatePath(`/chef/${chef.slug}`);
  revalidatePath("/admin/chefs");
  return ok();
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
  await sb.from("chef_title_statements").delete().eq("chef_id", chefId);
  const {
    data: { user },
  } = await sb.auth.getUser();
  await sb
    .from("admin_logs")
    .insert({ admin_id: user?.id, action: "chef_title_refused", target: chefId, details: { reason: input.data.reason } });

  try {
    const email = (chef.profiles as unknown as { email: string } | null)?.email;
    if (email) {
      const doc = renderEmail({
        preheader: "Ainda não conseguimos confirmar o título.",
        heading: "O seu pedido de título de Chef",
        lead: `Olá ${chef.display_name}. Ainda não conseguimos confirmar o título de Chef com o que nos enviou.`,
        facts: [["Porquê", input.data.reason]],
        paragraphs: [
          "Pode voltar a pedir quando quiser, com um certificado ou com mais detalhe sobre a sua experiência. Continua a receber pedidos entretanto: o título de Chef é um extra, não um requisito.",
        ],
        cta: { label: "Voltar a pedir", href: siteUrl("/dashboard/perfil#titulo") },
      });
      await sendEmail({ to: email, subject: "O seu pedido de título de Chef", text: doc.text, html: doc.html });
    }
  } catch (err) {
    console.error("[action] refuseChefTitle email:", err);
  }
  return ok();
}

const MakeChefInput = z.string().trim().toLowerCase().email();

/**
 * Turns a client account into a chef account, for someone who signed up on the wrong side. Only
 * the role changes: their bookings as a client stay. The chef contract is asked of them before
 * their profile goes to review, as for anyone who never accepted it. They get an email saying so.
 */
export async function makeChef(email: string): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Sem permissão.");
  const parsed = MakeChefInput.safeParse(email);
  if (!parsed.success) return fail("Escreva um email válido.");
  const sb = await createClient();
  const { data: profile } = await sb.from("profiles").select("id, role, name").eq("email", parsed.data).maybeSingle();
  if (!profile) return fail("Não encontrámos nenhuma conta com este email.");
  if (profile.role === "chef") return fail("Esta conta já é de chef.");
  if (profile.role === "admin") return fail("Esta conta é de administração: não pode ser mudada aqui.");
  const { error } = await sb.from("profiles").update({ role: "chef" }).eq("id", profile.id);
  if (error) return failWith(error, "makeChef", "Não foi possível mudar a conta. Tente de novo.");
  const {
    data: { user },
  } = await sb.auth.getUser();
  await sb
    .from("admin_logs")
    .insert({ admin_id: user?.id, action: "account_to_chef", target: profile.id, details: { from: profile.role } });

  try {
    const name = (profile.name as string | null)?.split(" ")[0] || "Olá";
    const doc = renderEmail({
      preheader: "Já pode criar o seu perfil de chef.",
      heading: "A sua conta passou a conta de chef",
      lead: `${name === "Olá" ? "Olá" : `Olá ${name}`}. Mudámos a sua conta no Ao Lume para conta de chef, como pediu.`,
      paragraphs: ["Saia da conta e volte a entrar: vai direto para a criação do seu perfil, com o mesmo email e a mesma palavra-passe."],
      cta: { label: "Criar o meu perfil", href: siteUrl("/dashboard/comecar") },
    });
    await sendEmail({ to: parsed.data, subject: "A sua conta Ao Lume passou a conta de chef", text: doc.text, html: doc.html });
  } catch (err) {
    console.error("[action] makeChef email:", err);
  }
  revalidatePath("/admin/chefs");
  return ok();
}
