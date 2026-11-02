import { revealDelay } from "@/lib/motion";

const TOOLS: [string, string][] = [
  ["Calendário", "Dias livres, bloqueios e área de serviço."],
  ["Chat com clientes", "Uma conversa por reserva, sem perder mensagens."],
  ["Menus e preços", "Preço fixo, por pessoa ou sob orçamento."],
  ["Cancelamento", "Flexível, moderado, rígido ou à sua medida."],
  ["Categorias de cozinha", "Até três, para os clientes o encontrarem nos filtros."],
  ["Deslocações e entregas", "Raio, zonas, taxas e o percurso do dia."],
  ["Levantamentos", "Horários na sua cozinha e código de confirmação."],
  ["Avaliações verificadas", "Só de quem reservou, com a sua resposta pública."],
];

function Check() {
  return (
    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cobalt-soft text-cobalt">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <path d="M5 12.5 10 17 19 7" />
      </svg>
    </span>
  );
}

/** What chefs get to run their bookings, as cards. */
export function ToolList() {
  return (
    <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {TOOLS.map(([title, text], i) => (
        <li key={title} className="al-rv flex gap-3 rounded-[10px] border border-line bg-white p-4" style={revealDelay(i % 4, 5)}>
          <Check />
          <div className="flex min-w-0 flex-col gap-0.5">
            <strong className="text-[16px]">{title}</strong>
            <span className="text-[14px] text-muted">{text}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
