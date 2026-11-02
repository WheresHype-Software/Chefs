import { revealDelay } from "@/lib/motion";
const POINTS: [string, string][] = [
  [
    "Cada chef é revisto antes de aparecer",
    "A equipa confirma a fotografia de perfil, as fotos dos pratos e o Instagram ou site de cada chef antes de o perfil ficar público.",
  ],
  [
    "Avaliações só de quem reservou",
    "Só pode avaliar quem fez uma reserva concluída com esse chef. Nada de avaliações compradas ou de desconhecidos.",
  ],
  [
    "Tudo combinado por escrito",
    "Cada reserva tem o seu chat e uma página com o estado do pedido, o preço e a política de cancelamento do chef.",
  ],
];

/** Why a stranger's kitchen is a safe bet: verification, real reviews, a written record. */
export function TrustPoints() {
  return (
    <section aria-labelledby="confianca-title" className="border-y border-line bg-paper">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-[1fr_2fr]">
        <h2 id="confianca-title" className="al-rv d m-0 max-w-[14ch] text-[clamp(28px,3.4vw,40px)] leading-[1.05]">
          Porque pode confiar
        </h2>
        <ul className="m-0 grid list-none gap-8 p-0 md:grid-cols-3 md:gap-6">
          {POINTS.map(([title, text], i) => (
            <li key={title} className="al-rv flex flex-col gap-2" style={revealDelay(i)}>
              <span aria-hidden="true" className="h-1 w-10 rounded-full bg-cobalt" />
              <h3 className="m-0 mt-2 text-[18px] font-bold leading-snug">{title}</h3>
              <p className="m-0 text-[16px] leading-relaxed text-ink-3">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
