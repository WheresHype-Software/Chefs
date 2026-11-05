import type { ReactNode } from "react";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { SITE_DOMAIN } from "@/lib/constants";
import { revealDelay } from "@/lib/motion";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** One line each, drawn rather than described: a list of six paragraphs reads as a wall. */
const ICONS: Record<string, ReactNode> = {
  link: (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} aria-hidden="true">
      <path d="M10 13.5a4 4 0 0 0 5.7.4l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7" />
      <path d="M14 10.5a4 4 0 0 0-5.7-.4l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7" />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" />
      <rect x="13.5" y="3.5" width="7" height="7" />
      <rect x="3.5" y="13.5" width="7" height="7" />
      <path d="M14 14h3m3 0v3m-6 3h3m3-3v3" />
    </svg>
  ),
  near: (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} aria-hidden="true">
      <path d="M12 21s7-5.5 7-10.5A7 7 0 0 0 5 10.5C5 15.5 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.5" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} aria-hidden="true">
      <path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9Z" />
    </svg>
  ),
  seal: (
    <span className="flex h-[22px] w-[22px] items-center justify-center">
      <VerifiedIcon size={22} />
    </span>
  ),
  season: (
    <svg viewBox="0 0 24 24" width="22" height="22" {...stroke} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
      <path d="M3.5 10h17M8 3v4m8-4v4" />
    </svg>
  ),
};

type Tile = { icon: keyof typeof ICONS; title: string; text: string; showLink?: boolean; warm?: boolean };

const TILES: Tile[] = [
  { icon: "link", title: "Um link para a bio", text: "Substitui o formulário e o “manda mensagem”.", showLink: true },
  { icon: "share", title: "Kit de partilha", text: "Código QR, imagens para stories e cartões com as suas melhores avaliações." },
  { icon: "near", title: "Perto de quem procura", text: "Clientes da sua zona encontram-no sem saberem o seu nome." },
  { icon: "star", title: "Avaliações verificadas", text: "Só quem concluiu uma reserva avalia, e pode responder a cada uma." },
  {
    icon: "seal",
    title: "Título de Chef verificado",
    text: "Envie um certificado de cozinha e apareça como Chef, com o selo ao lado do nome.",
  },
  { icon: "season", title: "Encomendas de época", text: "Bolo-rei, folar, sardinhadas de junho: abra pré-encomendas com data limite." },
];

/**
 * The wall: white glaze, cobalt marks, grout between the tiles, and exactly one warm one, as
 * DESIGN.md asks. The warm tile is the aspirational one — the title a chef earns — so the eye
 * lands on the thing worth wanting instead of wandering over six identical slabs.
 */
export function MarketingTiles() {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(270px,100%),1fr))] gap-px border border-line bg-line p-0">
      {TILES.map((t, i) => (
        <li
          key={t.title}
          className={`al-rv flex flex-col gap-3 p-6 transition-colors duration-200 md:p-7 ${
            t.warm ? "bg-yolk-soft" : "bg-white hover:bg-paper"
          }`}
          style={revealDelay(i)}
        >
          <span aria-hidden="true" className="text-cobalt">
            {ICONS[t.icon]}
          </span>
          <span className="d text-[21px] leading-[1.15] md:text-[23px]">{t.title}</span>
          <span className="text-[15px] leading-relaxed text-muted">{t.text}</span>
          {t.showLink && (
            <span className="num mt-1 w-fit bg-cobalt px-3 py-1.5 text-[14px] text-white">
              {SITE_DOMAIN}/chef/<span className="text-yolk">o-seu-nome</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
