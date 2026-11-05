/** The three promises the chef ads lead with, repeated where the chef decides. */
const PROMISES = ["O sinal é pago na app", "Decide o menu, os dias e o preço", "Perfil criado em poucos minutos"];

export function Promises({ tone = "ink" }: { tone?: "ink" | "white" }) {
  const dark = tone === "white";
  return (
    <ul className={`m-0 flex list-none flex-wrap gap-x-6 gap-y-2.5 p-0 text-[15px] ${dark ? "text-[#c9d6ee]" : "text-ink-3"}`}>
      {PROMISES.map((p) => (
        <li key={p} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
              dark ? "bg-yolk text-ink" : "bg-cobalt-soft text-cobalt"
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
              <path d="M5 12.5 10 17 19 7" />
            </svg>
          </span>
          {p}
        </li>
      ))}
    </ul>
  );
}
