import "server-only";
import { sendEmail, siteUrl } from "./email";
import { renderEmail } from "./email-template";
import { createAdminClient } from "./supabase/admin";

/**
 * Going back for the people who stopped halfway.
 *
 * Signing up and abandoning is the normal case, not the exception: someone registers on their
 * phone in the evening, has no photographs to hand, closes the tab. The first-steps list only
 * helps whoever comes back on their own.
 *
 * One email per stage per person, recorded before it is sent so a crash cannot turn a reminder
 * into a campaign.
 */

type Stage = "no_profile" | "draft_incomplete" | "draft_ready";

type Candidate = {
  profile_id: string;
  email: string;
  name: string | null;
  stage: Stage;
  chef_name: string | null;
  since: string;
};

function message(c: Candidate) {
  const first = (c.chef_name ?? c.name ?? "").split(" ")[0] || "olá";
  switch (c.stage) {
    case "no_profile":
      return {
        subject: "Falta criar a sua página no Ao Lume",
        doc: {
          preheader: "Levou dois minutos a criar a conta; falta a página.",
          heading: `${first}, a sua página ainda não existe`,
          lead: "Criou a conta mas não chegou a criar o perfil, por isso ninguém o encontra ainda.",
          paragraphs: [
            "Precisa do nome que quer mostrar, a zona onde cozinha e uma frase sobre si. As fotografias e os menus podem vir depois.",
            "Se mudou de ideias, ignore este email. Não voltamos a insistir.",
          ],
          cta: { label: "Criar a minha página", href: siteUrl("/dashboard/comecar") },
        },
      };
    case "draft_incomplete":
      return {
        subject: "Faltam fotografias e um menu para a sua página ficar pública",
        doc: {
          preheader: "O perfil está criado, falta o que os clientes veem.",
          heading: `${first}, está quase`,
          lead: "O seu perfil existe, mas ainda não tem o que os clientes precisam de ver para pedir uma reserva.",
          paragraphs: [
            "Faltam três fotografias de pratos e pelo menos um menu com preço. É o que decide quem reserva e quem fecha a página.",
            "Se mudou de ideias, ignore este email. Não voltamos a insistir.",
          ],
          cta: { label: "Continuar o perfil", href: siteUrl("/dashboard/comecar") },
        },
      };
    case "draft_ready":
      return {
        subject: "Está tudo pronto: falta enviar o perfil para revisão",
        doc: {
          preheader: "Um botão entre si e os primeiros pedidos.",
          heading: `${first}, falta um botão`,
          lead: "Tem fotografias, tem menu, e o perfil continua por enviar para revisão.",
          paragraphs: [
            "A nossa equipa revê cada perfil antes de ficar público. Depois disso começa a aparecer nas pesquisas da sua zona.",
            "Se mudou de ideias, ignore este email. Não voltamos a insistir.",
          ],
          cta: { label: "Enviar para revisão", href: siteUrl("/dashboard/comecar?passo=3") },
        },
      };
  }
}

export async function nudgeStalledChefs(limit = 50): Promise<{ sent: number; skipped: number }> {
  const sb = createAdminClient();
  if (!sb) return { sent: 0, skipped: 0 };

  const { data, error } = await sb.rpc("chefs_to_nudge", { p_limit: limit });
  if (error) {
    console.error("[nudges] chefs_to_nudge:", error.message);
    return { sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;
  for (const c of (data ?? []) as Candidate[]) {
    // Recorded first: a send that half-works must not be repeated tomorrow.
    const { error: markError } = await sb.rpc("record_chef_nudge", { p_profile: c.profile_id, p_stage: c.stage });
    if (markError) {
      skipped += 1;
      continue;
    }
    const { subject, doc } = message(c);
    const rendered = renderEmail(doc);
    const ok = await sendEmail({ to: c.email, subject, text: rendered.text, html: rendered.html }).catch((err) => {
      console.error("[nudges] send:", err);
      return false;
    });
    if (ok) sent += 1;
    else skipped += 1;
  }
  return { sent, skipped };
}
