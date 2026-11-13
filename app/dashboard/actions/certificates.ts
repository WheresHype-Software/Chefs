"use server";

import { z } from "zod";
import { getSession } from "@/lib/dashboard";
import { notifyAdmin, siteUrl } from "@/lib/email";
import { requestTranslator } from "@/lib/i18n/server";
import { fail, failWith, ok, type ActionResult as Result } from "@/lib/result";
import { chefContext, done } from "./context";

// A cooking certificate the team checks before the chef may be called "Chef".
const CertificateInput = z.object({
  title: z.string().trim().min(2).max(120),
  // "<user id>/cert-<uuid>.<ext>" in the private chef-docs bucket.
  path: z.string().regex(/^[0-9a-f-]{36}\/cert-[0-9a-f-]{36}\.(pdf|jpg|png)$/),
});

export async function addCertificate(title: string, path: string): Promise<Result> {
  const t = await requestTranslator("errors");
  const parsed = CertificateInput.safeParse({ title, path });
  if (!parsed.success) return fail(t("dashboard.certificates.titleRequired"));
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  // Only files the chef uploaded to their own folder (the storage policy allows nothing else).
  const session = await getSession();
  if (!parsed.data.path.startsWith(`${session.userId}/`)) return fail(t("invalidDocument"));
  const { error } = await ctx.sb.from("chef_certifications").insert({
    chef_id: ctx.chef.id,
    title: parsed.data.title,
    document_path: parsed.data.path,
  });
  if (error) return failWith(error, "addCertificate", t("dashboard.certificates.saveFailed"));

  // To the team: Portuguese.
  await notifyAdmin({
    subject: `Certificado para verificar: ${ctx.chef.display_name}`,
    preheader: `${ctx.chef.display_name} enviou «${parsed.data.title}» e pede o título de Chef.`,
    heading: "Um certificado espera verificação",
    lead: `${ctx.chef.display_name} enviou um certificado de cozinha. Depois de o confirmar, passa a aparecer como Chef, com a marca «Chef verificado».`,
    facts: [
      ["Quem envia", ctx.chef.display_name],
      ["Certificado", parsed.data.title],
      ["Perfil público", siteUrl(`/chef/${ctx.chef.slug}`)],
    ],
    cta: { label: "Abrir os pedidos de título", href: "/admin#titulos" },
    footnote: "O documento está num armazenamento privado: só abre pelo link da administração.",
  });
  return done("/dashboard/perfil");
}

const StatementInput = z.string().trim().min(20).max(1500);

/**
 * The Chef title without a certificate: the cook describes their experience (years in a kitchen,
 * teaching, where they cooked) and the team decides. The text is private to the cook and the team.
 */
export async function addTitleStatement(body: string): Promise<Result> {
  const t = await requestTranslator("errors");
  const parsed = StatementInput.safeParse(body);
  if (!parsed.success) return fail(t("dashboard.certificates.statementTooShort"));
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(t("dashboard.noChef"));
  const { error } = await ctx.sb.from("chef_title_statements").insert({ chef_id: ctx.chef.id, body: parsed.data });
  if (error) return failWith(error, "addTitleStatement", t("dashboard.certificates.statementFailed"));

  // To the team: Portuguese.
  await notifyAdmin({
    subject: `Pedido de título de Chef: ${ctx.chef.display_name}`,
    preheader: `${ctx.chef.display_name} descreveu a sua experiência e pede o título de Chef.`,
    heading: "Um pedido de título sem certificado",
    lead: `${ctx.chef.display_name} não tem certificado, mas descreveu a sua experiência na cozinha.`,
    facts: [
      ["Quem pede", ctx.chef.display_name],
      ["Perfil público", siteUrl(`/chef/${ctx.chef.slug}`)],
    ],
    paragraphs: [parsed.data],
    cta: { label: "Abrir os pedidos de título", href: "/admin/titulos" },
  });
  return done("/dashboard/perfil");
}
