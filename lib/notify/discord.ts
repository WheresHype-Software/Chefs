import "server-only";
import { serverEnv } from "@/lib/env.server";
import { siteUrl } from "@/lib/env";

/**
 * Avisos no Discord, para a equipa saber que alguém chegou sem ter o admin aberto.
 *
 * Vai só o que serve para decidir se vale a pena agir agora: um nome, de onde é, e o link para
 * o sítio onde se age. Email, telemóvel, NIF e IBAN ficam de fora de propósito — um canal de
 * Discord é lido por quem lá está e guardado para sempre no histórico, e nada disto precisa de
 * estar lá para alguém perceber que tem um chef novo à espera.
 *
 * Nunca atira: um webhook em baixo não pode impedir alguém de criar uma conta.
 */

const TIMEOUT_MS = 4000;

type Field = { name: string; value: string; inline?: boolean };

async function post(
  url: string | undefined,
  embed: { title: string; description?: string; color: number; fields?: Field[]; url?: string },
) {
  if (!url) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [{ ...embed, timestamp: new Date().toISOString() }] }),
      signal: controller.signal,
    });
    if (!res.ok) console.error("[discord] %s %s", res.status, (await res.text()).slice(0, 200));
  } catch (err) {
    console.error("[discord]", err);
  } finally {
    clearTimeout(timer);
  }
}

const COBALT = 0x1d4aa1;
const YOLK = 0xf0b429;
const OK = 0x1f6b45;

/** Criou conta como chef. Ainda não há perfil nenhum: é só a conta. */
export function announceChefSignup(name: string | null) {
  return post(serverEnv.discord.chefSignup, {
    title: "Nova conta de chef",
    description: `${name || "Sem nome"} criou conta. O perfil ainda está por fazer.`,
    color: YOLK,
  });
}

/** Criou conta como cliente. */
export function announceUserSignup(name: string | null) {
  return post(serverEnv.discord.userSignup, {
    title: "Nova conta de cliente",
    description: `${name || "Sem nome"} criou conta.`,
    color: COBALT,
  });
}

/** Terminou o perfil e enviou-o para revisão: há uma decisão à espera. */
export function announceChefForReview(chef: { display_name: string; area_name: string | null; slug: string }) {
  return post(serverEnv.discord.chefReview, {
    title: "Perfil de chef por aprovar",
    description: `${chef.display_name} enviou o perfil para revisão.`,
    color: OK,
    url: siteUrl("/admin"),
    fields: [
      { name: "Zona", value: chef.area_name || "sem zona", inline: true },
      { name: "Perfil", value: `/chef/${chef.slug}`, inline: true },
    ],
  });
}

const MODE: Record<string, string> = { home: "Em casa do cliente", delivery: "Entrega", pickup: "Para levantar" };

/**
 * Um pedido de reserva novo. Vai o que a equipa precisa para acompanhar: o chef, a referência,
 * o primeiro nome do cliente, quantas pessoas, o serviço, a data e as notas (alergias, ocasião).
 * Email, telemóvel e morada ficam de fora, como nos outros avisos.
 */
export function announceBooking(b: {
  ref: string;
  chefName: string;
  clientName: string;
  guests: number;
  offerTitle: string;
  mode: string | null;
  date: string;
  time: string;
  notes?: string | null;
}) {
  const notes = b.notes?.trim();
  return post(serverEnv.discord.booking, {
    title: `Novo pedido de reserva · ${b.ref}`,
    description: `${b.clientName.split(" ")[0] || "Um cliente"} pediu uma reserva a ${b.chefName}.`,
    color: OK,
    url: siteUrl("/admin"),
    fields: [
      { name: "Chef", value: b.chefName, inline: true },
      { name: "Pedido", value: b.ref, inline: true },
      { name: "Pessoas / unidades", value: String(b.guests), inline: true },
      { name: "Serviço", value: b.mode ? `${b.offerTitle} · ${MODE[b.mode] ?? b.mode}` : b.offerTitle },
      { name: "Quando", value: `${b.date} · ${b.time}`, inline: true },
      ...(notes ? [{ name: "Notas do cliente", value: notes.length > 500 ? `${notes.slice(0, 500)}…` : notes }] : []),
    ],
  });
}
