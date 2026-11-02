import { Photo } from "@/components/ui/Photo";
import { firstName } from "@/lib/format";
import type { ChefProfile } from "@/lib/types";

/** Captioned dish photos; nothing when the chef has none. */
export function ChefDishes({ chef }: { chef: ChefProfile }) {
  const dishes = chef.gallery.filter((d): d is { url: string; caption: string } => Boolean(d.url));
  if (dishes.length === 0) return null;
  return (
    <section id="pratos" aria-labelledby="pratos-title" className="flex scroll-mt-32 flex-col gap-[18px]">
      <div className="flex flex-col gap-1">
        <h2 id="pratos-title" className="d m-0 text-[32px]">
          Pratos
        </h2>
        <p className="m-0 text-[15px] text-muted">Fotografias de pratos feitos por {firstName(chef.name)}.</p>
      </div>
      <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-5 p-0 md:grid-cols-3 md:gap-x-4">
        {dishes.map((d, i) => (
          <li key={`${d.url}-${i}`}>
            <figure className="m-0 flex flex-col gap-2">
              <div className="aspect-square overflow-hidden rounded-[10px] bg-paper">
                <Photo
                  photo={d.url}
                  alt={d.caption || `Prato de ${chef.name}`}
                  sizes="(min-width: 768px) 20vw, 45vw"
                  className="h-full w-full"
                />
              </div>
              {d.caption && <figcaption className="text-[14px] leading-snug text-ink-3">{d.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
