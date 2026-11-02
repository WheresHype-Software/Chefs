import { ChefSection } from "@/components/chef/ChefSection";
import { titledFirst } from "@/lib/format";
import { languageNames } from "@/lib/languages";
import type { ChefProfile } from "@/lib/types";

/** "Sobre": bio, experience and languages (face and specialty are in the header, once); then "Percurso" when there is any. */
export function ChefAbout({ chef }: { chef: ChefProfile }) {
  const first = titledFirst(chef);
  const extra = [
    chef.yearsExperience ? `${chef.yearsExperience} anos de experiência` : null,
    chef.languages.length ? `Fala ${languageNames(chef.languages).join(", ").toLowerCase()}` : null,
  ].filter(Boolean);

  return (
    <>
      <ChefSection id="sobre" icon="person" title={`Sobre ${first}`} subtitle="Quem cozinha, como trabalha e a sua experiência.">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="m-0 max-w-[680px] whitespace-pre-line text-[17px] leading-relaxed">
            {chef.bio || `${first} ainda não escreveu sobre si. Veja os menus abaixo.`}
          </p>
          {extra.length > 0 && (
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {extra.map((e) => (
                <li key={e} className="rounded-full bg-paper px-3 py-1 text-[14px] text-ink-3">
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      </ChefSection>

      {(chef.experience.length > 0 || chef.certifications.length > 0) && (
        <ChefSection id="percurso" icon="award" title="Percurso" subtitle="Onde trabalhou e a formação que tem.">
          <ul className="m-0 list-none p-0">
            {chef.experience.map((e) => (
              <li key={e.place + e.years} className="flex flex-wrap justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <span>
                  <strong className="font-semibold">{e.place}</strong>
                  {e.role ? ` · ${e.role}` : ""}
                </span>
                <span className="tabular-nums text-muted">{e.years}</span>
              </li>
            ))}
            {chef.certifications.map((c) => (
              <li key={c.title} className="flex flex-wrap justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <span>
                  <strong className="font-semibold">{c.title}</strong>
                  {c.issuer ? ` · ${c.issuer}` : ""}
                </span>
                {c.verified && <span className="text-[13px] font-semibold text-cobalt">Documento verificado</span>}
              </li>
            ))}
          </ul>
        </ChefSection>
      )}
    </>
  );
}
