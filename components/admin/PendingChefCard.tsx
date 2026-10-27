import { DecisionCard } from "@/components/admin/DecisionCard";
import { TIER_LABEL } from "@/lib/format";

export type PendingChef = {
  id: string;
  display_name: string;
  slug: string;
  tier: string;
  headline: string | null;
  bio: string | null;
  area_name: string | null;
  socials: { instagram?: string; website?: string };
  badges: string[];
  created_at: string;
  chef_photos: { url: string; kind: string; caption: string | null; sort_order: number }[];
  chef_certifications: { title: string; document_path: string | null }[];
  chef_categories: { cuisine_categories: { name_pt: string } | null }[];
  offers: { count: number }[];
};

type Check = { label: string; ok: boolean; required: boolean };

function Checklist({ checks }: { checks: Check[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {checks.map((c) => (
        <li
          key={c.label}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium ${
            c.ok
              ? "border-line-2 bg-white text-ink"
              : c.required
                ? "border-danger/40 bg-[#fbeeec] text-danger"
                : "border-yolk bg-yolk-soft text-ink"
          }`}
        >
          <span aria-hidden="true">{c.ok ? "✓" : c.required ? "✕" : "!"}</span>
          <span>
            {c.label}
            <span className="sr-only">{c.ok ? ": feito" : c.required ? ": em falta (obrigatório)" : ": recomendado"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function PhotoLink({ url, alt, label }: { url: string; alt: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noopener" className="flex flex-col gap-1.5 text-ink no-underline">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} loading="lazy" className="aspect-square w-full rounded-[10px] bg-paper object-cover" />
      <span className="text-[13px] leading-snug text-muted">{label}</span>
    </a>
  );
}

/** One chef waiting for approval: readiness at a glance, who they are, their photo apart from the dishes, then the decision. */
export function PendingChefCard({ chef: c }: { chef: PendingChef }) {
  const portrait = c.chef_photos.find((p) => p.kind === "portrait");
  const selfie = c.chef_photos.find((p) => p.kind === "selfie");
  const dishes = c.chef_photos.filter((p) => p.kind === "gallery").sort((a, b) => a.sort_order - b.sort_order);
  const described = dishes.filter((d) => d.caption?.trim()).length;
  const offerCount = c.offers[0]?.count ?? 0;
  const cuisines = c.chef_categories.map((k) => k.cuisine_categories?.name_pt).filter(Boolean);
  const checks: Check[] = [
    { label: "Fotografia de perfil", ok: Boolean(portrait || selfie), required: true },
    { label: `Pratos ${dishes.length}/3`, ok: dishes.length >= 3, required: true },
    { label: "Instagram ou site", ok: Boolean(c.socials.instagram || c.socials.website), required: true },
    { label: `Descrições ${described}/${dishes.length}`, ok: dishes.length > 0 && described === dishes.length, required: false },
    { label: "Sobre si", ok: (c.bio?.trim().length ?? 0) >= 40, required: false },
    { label: `Ofertas ${offerCount}`, ok: offerCount > 0, required: false },
  ];
  const missing = checks.filter((x) => !x.ok && x.required).length;

  return (
    <DecisionCard chefId={c.id} chefName={c.display_name} slug={c.slug} badges={c.badges}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-cobalt-soft">
          {(portrait ?? selfie) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={(portrait ?? selfie)!.url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
          <span className="lab text-muted">
            {TIER_LABEL[c.tier]} · {c.area_name ?? "sem zona"} · enviado {new Date(c.created_at).toLocaleDateString("pt-PT")}
          </span>
          <h3 className="d m-0 text-[28px] font-normal leading-none">{c.display_name}</h3>
          <span className="text-sm [overflow-wrap:anywhere]">
            {c.socials.instagram && (
              <a href={`https://instagram.com/${c.socials.instagram.replace("@", "")}`} target="_blank" rel="noopener">
                {c.socials.instagram}
              </a>
            )}
            {c.socials.instagram && c.socials.website && " · "}
            {c.socials.website && (
              <a href={c.socials.website} target="_blank" rel="noopener noreferrer">
                {c.socials.website}
              </a>
            )}
          </span>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${missing ? "bg-[#fbeeec] text-danger" : "bg-cobalt-soft text-cobalt-deep"}`}
        >
          {missing ? `Faltam ${missing} ${missing === 1 ? "requisito" : "requisitos"}` : "Pronto para aprovar"}
        </span>
      </div>

      <Checklist checks={checks} />

      {(c.headline || c.bio || cuisines.length > 0 || c.chef_certifications.length > 0) && (
        <div className="flex flex-col gap-2 rounded-[3px] bg-paper px-4 py-3.5">
          {c.headline && <span className="font-semibold">{c.headline}</span>}
          {cuisines.length > 0 && <span className="text-sm text-muted">{cuisines.join(" · ")}</span>}
          {c.bio && <p className="m-0 whitespace-pre-line text-[15px] text-ink-3">{c.bio}</p>}
          {c.chef_certifications.length > 0 && (
            <span className="text-sm text-muted">Certificados: {c.chef_certifications.map((x) => x.title).join(", ")}</span>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(180px,220px)_1fr]">
        <section aria-label="Fotografia do chef" className="flex flex-col gap-3">
          <h4 className="lab m-0 border-b border-line pb-2">Fotografia do chef</h4>
          {portrait || selfie ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
              {portrait && <PhotoLink url={portrait.url} alt={`Fotografia de ${c.display_name}`} label="Perfil · abrir ↗" />}
              {selfie && <PhotoLink url={selfie.url} alt={`Selfie de ${c.display_name}`} label="Selfie de verificação · abrir ↗" />}
            </div>
          ) : (
            <span className="flex aspect-square w-[160px] items-center justify-center rounded-[10px] bg-paper text-sm text-danger md:w-full">
              Sem fotografia
            </span>
          )}
        </section>

        <section aria-label="Fotografias de pratos" className="flex min-w-0 flex-col gap-3">
          <h4 className="lab m-0 border-b border-line pb-2">Pratos · {dishes.length}</h4>
          {dishes.length === 0 ? (
            <span className="text-sm text-muted">Sem fotografias de pratos.</span>
          ) : (
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
              {dishes.map((p) => (
                <li key={p.url}>
                  <PhotoLink url={p.url} alt={p.caption ?? "Prato"} label={p.caption || "Sem descrição"} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DecisionCard>
  );
}
