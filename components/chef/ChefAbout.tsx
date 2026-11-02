import { firstName } from "@/lib/format";
import type { ChefProfile } from "@/lib/types";

// Profiles store language codes; show them as words.
const LANGUAGE: Record<string, string> = { pt: "português", en: "inglês", es: "espanhol", fr: "francês", it: "italiano", de: "alemão" };

/** "Sobre": bio, experience and languages, then "Percurso" (experience and certifications) when there is any. */
export function ChefAbout({ chef }: { chef: ChefProfile }) {
  const first = firstName(chef.name);
  const extra = [
    chef.yearsExperience ? `${chef.yearsExperience} anos de experiência` : null,
    chef.languages.length ? `Fala ${chef.languages.map((l) => LANGUAGE[l] ?? l).join(", ")}` : null,
  ].filter(Boolean);
  return (
    <>
      <section id="sobre" aria-labelledby="sobre-title" className="flex scroll-mt-32 flex-col gap-3.5">
        <h2 id="sobre-title" className="d m-0 text-[32px]">
          Sobre {first}
        </h2>
        <p className="m-0 max-w-[680px] text-[17px] leading-relaxed">
          {chef.bio || `${first} ainda não escreveu sobre si. Veja os menus e os pratos abaixo.`}
        </p>
        {extra.length > 0 && <p className="m-0 text-[15px] text-muted">{extra.join(" · ")}</p>}
      </section>

      {(chef.experience.length > 0 || chef.certifications.length > 0) && (
        <section className="flex flex-col gap-3.5">
          <h2 className="d m-0 text-[32px]">Percurso</h2>
          <ul className="m-0 list-none border-t border-line-2 p-0">
            {chef.experience.map((e) => (
              <li key={e.place + e.years} className="flex flex-wrap justify-between gap-3 border-b border-line py-3.5">
                <span>
                  <strong className="font-semibold">{e.place}</strong>
                  {e.role ? ` · ${e.role}` : ""}
                </span>
                <span className="num text-muted">{e.years}</span>
              </li>
            ))}
            {chef.certifications.map((c) => (
              <li key={c.title} className="flex flex-wrap justify-between gap-3 border-b border-line py-3.5">
                <span>
                  <strong className="font-semibold">{c.title}</strong>
                  {c.issuer ? ` · ${c.issuer}` : ""}
                </span>
                {c.verified && <span className="lab text-muted">Documento verificado</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
