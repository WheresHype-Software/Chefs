import { CertificateLinks } from "@/components/admin/CertificateLinks";
import { DecisionCard } from "@/components/admin/DecisionCard";
import type { Decision } from "@/components/admin/ChefDecision";
import type { CertificateDoc } from "@/lib/admin/certificates";
import { readiness, type Check } from "@/lib/admin/readiness";
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
  /** Signed links to the certificate files, made by the admin page. */
  certificateDocs: CertificateDoc[];
  chef_categories: { cuisine_categories: { name_pt: string } | null }[];
  offers: { count: number }[];
};

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

/** The closed card: face, name, where and when, readiness, and whether a certificate came with it. */
function Summary({ chef: c, missing }: { chef: PendingChef; missing: Check[] }) {
  const face = c.chef_photos.find((p) => p.kind === "portrait") ?? c.chef_photos.find((p) => p.kind === "selfie");
  return (
    <span className="flex items-center gap-3.5">
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-cobalt-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {face && <img src={face.url} alt="" className="h-full w-full object-cover" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="m-0 truncate text-[18px] font-bold leading-tight">{c.display_name}</h3>
        <span className="truncate text-[13px] text-muted">
          {TIER_LABEL[c.tier]} · {c.area_name ?? "sem zona"} · enviado {new Date(c.created_at).toLocaleDateString("pt-PT")}
          {c.chef_certifications.length > 0 && " · com certificado"}
        </span>
      </span>
      <span
        className={`hidden shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold sm:inline ${
          missing.length ? "bg-[#fbeeec] text-danger" : "bg-cobalt-soft text-cobalt-deep"
        }`}
      >
        {missing.length ? `Falta: ${missing.map((m) => m.label.replace(/ \d+\/\d+$/, "")).join(", ")}` : "Pronto"}
      </span>
    </span>
  );
}

type Props = { chef: PendingChef; open: boolean; onToggle: () => void; onDecided: (decision: Decision) => void };

/** One application: a summary row that opens into who they are, their photo apart from the dishes, then the decision. */
export function PendingChefCard({ chef: c, open, onToggle, onDecided }: Props) {
  const portrait = c.chef_photos.find((p) => p.kind === "portrait");
  const selfie = c.chef_photos.find((p) => p.kind === "selfie");
  const dishes = c.chef_photos.filter((p) => p.kind === "gallery").sort((a, b) => a.sort_order - b.sort_order);
  const cuisines = c.chef_categories.map((k) => k.cuisine_categories?.name_pt).filter(Boolean);
  const { checks, missing } = readiness(c);

  return (
    <DecisionCard
      chefId={c.id}
      chefName={c.display_name}
      slug={c.slug}
      badges={c.badges}
      summary={<Summary chef={c} missing={missing} />}
      open={open}
      onToggle={onToggle}
      onDecided={onDecided}
    >
      <Checklist checks={checks} />

      {(c.socials.instagram || c.socials.website) && (
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
      )}

      {(c.headline || c.bio || cuisines.length > 0 || c.chef_certifications.length > 0) && (
        <div className="flex flex-col gap-2 rounded-[3px] bg-paper px-4 py-3.5">
          {c.headline && <span className="font-semibold">{c.headline}</span>}
          {cuisines.length > 0 && <span className="text-sm text-muted">{cuisines.join(" · ")}</span>}
          {c.bio && <p className="m-0 whitespace-pre-line text-[15px] text-ink-3">{c.bio}</p>}
          {c.chef_certifications.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted">Certificados (dê a marca «Certificado» para aparecer como Chef):</span>
              <CertificateLinks docs={c.certificateDocs} />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(180px,220px)_1fr]">
        <section aria-label="Fotografia do chef" className="flex flex-col gap-3">
          <h4 className="lab m-0 border-b border-line pb-2">Fotografia do chef</h4>
          {!selfie && <span className="text-[13px] text-danger">Sem selfie de verificação</span>}
          {portrait || selfie ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
              {portrait && <PhotoLink url={portrait.url} alt={`Fotografia de ${c.display_name}`} label="Perfil · abrir ↗" />}
              {selfie && <PhotoLink url={selfie.url} alt={`Selfie de ${c.display_name}`} label="Selfie (privada) · abrir ↗" />}
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
