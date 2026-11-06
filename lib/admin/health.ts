import "server-only";
import { cache } from "react";
import { serverEnv } from "../env.server";

/**
 * Whether email actually works, asked rather than assumed.
 *
 * A dead Resend key answers 401 to everything and the only trace is a line in the server log,
 * which nobody reads until someone asks why an approval never arrived. This puts the answer on
 * the page where that question gets asked.
 */
export type EmailHealth = { state: "ok" | "off" | "broken"; detail: string };

const fromDomain = (): string => serverEnv.emailFrom.match(/@([^>\s]+)/)?.[1]?.toLowerCase() ?? "";

export const emailHealth = cache(async (): Promise<EmailHealth> => {
  const key = serverEnv.resendApiKey;
  if (!key) {
    return { state: "off", detail: "Sem RESEND_API_KEY: os emails são escritos no log do servidor em vez de enviados." };
  }
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 400) {
      return { state: "broken", detail: "A Resend recusa a chave (401). Nenhum email está a ser entregue, em lado nenhum." };
    }
    if (!res.ok) return { state: "broken", detail: `A Resend respondeu ${res.status}. Os envios podem estar a falhar.` };

    const body = (await res.json()) as { data?: { name?: string; status?: string }[] };
    const domain = fromDomain();
    const match = (body.data ?? []).find((d) => d.name?.toLowerCase() === domain);
    if (!match) {
      return {
        state: "broken",
        detail: `O domínio ${domain} não está na Resend, mas é de lá que o EMAIL_FROM envia. Os envios vão falhar.`,
      };
    }
    if (match.status !== "verified") {
      return { state: "broken", detail: `O domínio ${domain} está na Resend como «${match.status}», não verificado.` };
    }
    return { state: "ok", detail: `A enviar de ${serverEnv.emailFrom}.` };
  } catch (err) {
    console.error("[health] resend:", err);
    return { state: "broken", detail: "Não foi possível falar com a Resend para confirmar o envio de emails." };
  }
});
