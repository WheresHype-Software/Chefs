import "server-only";
import { cache } from "react";
import { certificateLinks } from "./certificates";
import { readiness } from "./readiness";
import type { PendingChef } from "@/components/admin/PendingChefCard";
import type { RosterChef } from "@/components/admin/ChefRoster";
import { requiredDepositPercent } from "../money";
import { selfieLink } from "../selfie";
import { getSettings, moneyRules } from "../settings";
import { createClient } from "../supabase/server";

/**
 * As filas da administração, cada uma a ler só o que a sua página mostra.
 *
 * Estava tudo num Promise.all de nove consultas para desenhar uma página com quatro secções
 * empilhadas: ver uma denúncia obrigava a esperar pelos perfis por aprovar, pelas fotografias e
 * pelos links assinados das selfies. Separadas e dentro de cache(), cada página paga o que usa, e
 * o cabeçalho pode contar as filas todas sem repetir consultas no mesmo render.
 */

type WithCerts = { chef_certifications: { title: string; document_path: string | null }[] };

export const getPendingChefs = cache(async (): Promise<PendingChef[]> => {
  const sb = await createClient();
  const { data } = await sb
    .from("chefs")
    .select(
      "id, display_name, slug, tier, headline, bio, area_name, socials, badges, created_at, chef_photos(url, kind, caption, sort_order), chef_certifications(title, document_path), chef_categories(cuisine_categories(name_pt)), offers(count)",
    )
    .eq("status", "pending")
    .order("created_at");

  const rows = (data ?? []) as unknown as Omit<PendingChef, "certificateDocs">[];
  const withCerts = await Promise.all(
    rows.map(async (r) => ({ ...r, certificateDocs: await certificateLinks(sb, (r as unknown as WithCerts).chef_certifications) })),
  );
  // A selfie de verificação é privada: a equipa vê-a por um link que expira.
  const withSelfies = await Promise.all(
    withCerts.map(async (r) => ({
      ...r,
      chef_photos: await Promise.all(
        r.chef_photos.map(async (p) => (p.kind === "selfie" ? { ...p, url: (await selfieLink(sb, p.url)) ?? "" } : p)),
      ),
    })),
  );
  // Candidaturas completas primeiro; dentro de cada grupo mantém-se a ordem da consulta.
  return withSelfies.sort((a, b) => Number(readiness(b).ready) - Number(readiness(a).ready));
});

export type TitleRequest = { id: string; display_name: string; slug: string; badges: string[] } & WithCerts & {
    certificateDocs: Awaited<ReturnType<typeof certificateLinks>>;
  };

export const getTitleRequests = cache(async (): Promise<TitleRequest[]> => {
  const sb = await createClient();
  // Cozinheiros aprovados que enviaram certificado e ainda não são «Chef».
  const { data } = await sb
    .from("chefs")
    .select("id, display_name, slug, badges, chef_certifications!inner(title, document_path)")
    .eq("status", "approved")
    .not("badges", "cs", "{certified}")
    .order("display_name");

  const rows = (data ?? []) as unknown as ({ id: string; display_name: string; slug: string; badges: string[] } & WithCerts)[];
  return Promise.all(rows.map(async (r) => ({ ...r, certificateDocs: await certificateLinks(sb, r.chef_certifications) })));
});

export type ReportedReview = {
  reportId: string;
  reason: string;
  id: string;
  author_name: string;
  comment: string | null;
  overall: number;
  chefName: string | null;
};

export const getReportedReviews = cache(async (): Promise<ReportedReview[]> => {
  const sb = await createClient();
  const { data: reports } = await sb
    .from("reports")
    .select("id, target_id, reason, created_at")
    .eq("status", "open")
    .eq("target_type", "review")
    .order("created_at");

  const open = (reports ?? []) as { id: string; target_id: string; reason: string }[];
  if (!open.length) return [];

  const { data: reviews } = await sb
    .from("reviews")
    .select("id, author_name, comment, overall, chefs(display_name)")
    .in(
      "id",
      open.map((r) => r.target_id),
    );

  const byId = new Map(
    (
      (reviews ?? []) as unknown as {
        id: string;
        author_name: string;
        comment: string | null;
        overall: number;
        chefs: { display_name: string } | null;
      }[]
    ).map((r) => [r.id, r]),
  );
  return open.flatMap((r) => {
    const rv = byId.get(r.target_id);
    return rv ? [{ reportId: r.id, reason: r.reason, ...rv, chefName: rv.chefs?.display_name ?? null }] : [];
  });
});

export type NeverStarted = { id: string; name: string | null; email: string | null; created_at: string };

export const getRoster = cache(async (): Promise<{ chefs: RosterChef[]; neverStarted: NeverStarted[] }> => {
  const sb = await createClient();
  const [roster, chefProfiles, settings] = await Promise.all([
    // Tudo o que a fila de aprovação já não mostra, para haver onde o gerir.
    sb
      .from("chefs")
      .select(
        "id, profile_id, display_name, slug, status, area_name, badges, deposit_percent, rating_avg, review_count, completed_bookings, chef_photos(kind), offers(active)",
      )
      .neq("status", "pending")
      .order("status")
      .order("display_name"),
    // Criou conta de chef e nunca fez perfil: invisível em todo o lado.
    sb.from("profiles").select("id, name, email, created_at").eq("role", "chef").order("created_at", { ascending: false }),
    getSettings(),
  ]);

  const minDeposit = settings.paymentsEnabled ? requiredDepositPercent(moneyRules(settings)) : 0;
  const chefs: RosterChef[] = (
    (roster.data ?? []) as unknown as (Omit<RosterChef, "photos" | "activeOffers" | "minDeposit"> & {
      chef_photos: { kind: string }[];
      offers: { active: boolean }[];
    })[]
  ).map((c) => ({
    ...c,
    photos: (c.chef_photos ?? []).filter((p) => p.kind !== "selfie").length,
    activeOffers: (c.offers ?? []).filter((o) => o.active).length,
    minDeposit,
  }));

  const withProfile = new Set(((roster.data ?? []) as { profile_id: string | null }[]).map((c) => c.profile_id).filter(Boolean));
  const neverStarted = ((chefProfiles.data ?? []) as NeverStarted[]).filter((p) => !withProfile.has(p.id));
  return { chefs, neverStarted };
});

export const getAdminStats = cache(async () => {
  const sb = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [chefsApproved, requests, completed, reviews] = await Promise.all([
    sb.from("chefs").select("id", { count: "exact", head: true }).eq("status", "approved"),
    sb.from("bookings").select("status", { count: "exact" }).gte("created_at", weekAgo),
    sb.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", weekAgo),
    sb.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
  ]);

  const rows = requests.data ?? [];
  const answered = rows.filter((r) => !["requested", "expired"].includes(r.status)).length;
  const accepted = rows.filter((r) => ["accepted", "confirmed", "completed"].includes(r.status)).length;
  return {
    activeChefs: chefsApproved.count ?? 0,
    requests: requests.count ?? 0,
    acceptance: answered ? Math.round((accepted / answered) * 100) : null,
    completed: completed.count ?? 0,
    reviews: reviews.count ?? 0,
  };
});
