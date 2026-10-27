import { ChefDecision } from "@/components/admin/ChefDecision";
import { TIER_LABEL } from "@/lib/format";

export type PendingChef = {
  id: string;
  display_name: string;
  slug: string;
  tier: string;
  area_name: string | null;
  socials: { instagram?: string; website?: string };
  badges: string[];
  created_at: string;
  chef_photos: { url: string; kind: string; caption: string | null; sort_order: number }[];
  chef_certifications: { title: string; document_path: string | null }[];
};

/** One chef waiting for approval: who they are, their own photo apart from the dish photos, and the decision. */
export function PendingChefCard({ chef: c }: { chef: PendingChef }) {
  const portrait = c.chef_photos.find((p) => p.kind === "portrait");
  const selfie = c.chef_photos.find((p) => p.kind === "selfie");
  const dishes = c.chef_photos.filter((p) => p.kind === "gallery").sort((a, b) => a.sort_order - b.sort_order);
  return (
    <article className="box flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <span className="lab text-muted">
          {TIER_LABEL[c.tier]} · {c.area_name} · desde {new Date(c.created_at).toLocaleDateString("pt-PT")}
        </span>
        <span className="d text-[28px] leading-none">{c.display_name}</span>
        <span className="text-sm [overflow-wrap:anywhere]">
          {c.socials.instagram && (
            <a href={`https://instagram.com/${c.socials.instagram.replace("@", "")}`} target="_blank" rel="noopener">
              {c.socials.instagram}
            </a>
          )}
          {c.socials.website && (
            <>
              {" · "}
              <a href={c.socials.website} target="_blank" rel="noopener noreferrer">
                {c.socials.website}
              </a>
            </>
          )}
        </span>
        {c.chef_certifications.length > 0 && (
          <span className="text-sm text-muted">Certificados: {c.chef_certifications.map((x) => x.title).join(", ")}</span>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(180px,220px)_1fr]">
        <section aria-label="Fotografia do chef" className="flex flex-col gap-3">
          <h3 className="lab m-0 border-b border-line pb-2">Fotografia do chef</h3>
          {portrait || selfie ? (
            <div className="flex flex-wrap gap-3 md:flex-col">
              {[portrait && { p: portrait, label: "Perfil" }, selfie && { p: selfie, label: "Selfie de verificação" }]
                .filter((x) => !!x)
                .map(({ p, label }) => (
                  <a
                    key={p.url}
                    href={p.url}
                    target="_blank"
                    rel="noopener"
                    className="flex w-[160px] flex-col gap-1.5 text-ink no-underline md:w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`${label} de ${c.display_name}`} className="aspect-square w-full rounded-[10px] object-cover" />
                    <span className="text-[13px] text-muted">{label} · abrir ↗</span>
                  </a>
                ))}
            </div>
          ) : (
            <span className="flex aspect-square w-[160px] items-center justify-center rounded-[10px] bg-paper text-sm text-danger md:w-full">
              Sem fotografia
            </span>
          )}
        </section>

        <section aria-label="Fotografias de pratos" className="flex min-w-0 flex-col gap-3">
          <h3 className="lab m-0 flex justify-between gap-3 border-b border-line pb-2">
            <span>Pratos · {dishes.length}</span>
            {dishes.length < 3 && <span className="text-danger">Menos de 3</span>}
          </h3>
          {dishes.length === 0 ? (
            <span className="text-sm text-muted">Sem fotografias de pratos.</span>
          ) : (
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
              {dishes.map((p) => (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noopener" className="flex flex-col gap-1.5 text-ink no-underline">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption ?? "Prato"} className="aspect-square w-full rounded-[10px] object-cover" />
                    <span className="text-[13px] leading-snug text-muted">{p.caption || "Sem descrição"}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="border-t border-line pt-5">
        <ChefDecision chefId={c.id} badges={c.badges} />
      </div>
    </article>
  );
}
