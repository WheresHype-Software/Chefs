// Static mock-ups of the dashboard shown beside each tab of the "ferramenta" section.

/** The chef's public page. */
export function PagePreview() {
  return (
    <div className="al-in overflow-hidden rounded-[3px] border border-line">
      <div className="border-b border-line bg-paper truncate px-3.5 py-2.5 text-[13px] text-ink-3">aolume.pt/chef/marta-figueiredo</div>
      <div className="h-[120px] bg-cobalt-soft" />
      <div className="flex flex-col gap-1.5 p-[18px]">
        <span className="lab text-muted">Profissional · Campo de Ourique</span>
        <span className="d text-[28px]">Marta Figueiredo</span>
        <span className="text-[13px] text-muted">★ 4,9 · desde 55 € por pessoa</span>
        <span className="btn btn-sm mt-2 self-start">Pedir reserva</span>
      </div>
    </div>
  );
}

/** The requests inbox. */
export function RequestsPreview() {
  return (
    <div className="al-in border-t border-line-2">
      {[
        ["Sofia Ramos", "Jantar em casa · 6 pessoas", "Novo · 9 h", "bg-cobalt text-white"],
        ["Luís Antunes", "Mariscada · 4 pessoas", "Data proposta", "border border-ink"],
        ["Ana Pires", "Jantar do Minho · 8 pessoas", "Confirmado", "border border-line-3 text-muted"],
      ].map(([w, d, s, c]) => (
        <div key={w} className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line py-4">
          <span className="flex flex-col">
            <span className="d text-xl">{w}</span>
            <span className="text-[13px] text-muted">{d}</span>
          </span>
          <span className={`lab rounded-[2px] px-2.5 py-1.5 ${c}`}>{s}</span>
        </div>
      ))}
    </div>
  );
}

/** A month of open, booked and blocked days. */
export function AgendaPreview() {
  return (
    <div className="al-in flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between border-b border-line-2 pb-2.5">
        <span className="d text-xl italic">Este mês</span>
        <span className="lab text-muted">Raio 15 km</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: 29 }, (_, i) => {
          const d = i + 1;
          const c = [6, 7, 14, 21, 22].includes(d)
            ? "bg-cobalt text-white"
            : [10, 11, 24].includes(d)
              ? "text-faint line-through"
              : "border border-line-3";
          return (
            <span key={d} className={`num flex h-9 items-center justify-center rounded-[2px] text-[13px] ${c}`}>
              {d}
            </span>
          );
        })}
      </div>
      <span className="text-xs text-muted">Preenchido: reservado · Contorno: livre · Riscado: bloqueado</span>
    </div>
  );
}

/** A booking chat. */
export function ChatPreview() {
  return (
    <div className="al-in flex flex-col gap-2.5">
      <span className="max-w-[80%] self-start rounded-[3px] border border-line px-3.5 py-2.5 text-sm">
        Olá! Temos uma pessoa vegetariana, é possível?
      </span>
      <span className="max-w-[80%] self-end rounded-[3px] bg-cobalt px-3.5 py-2.5 text-sm text-white">
        Claro, faço um arroz de cogumelos em vez do pato.
      </span>
      <span className="lab self-center py-2 text-muted">Pedido aceite · sinal de 99 € combinado</span>
      <span className="max-w-[80%] self-start rounded-[3px] border border-line px-3.5 py-2.5 text-sm">Perfeito, já enviei por MB WAY.</span>
    </div>
  );
}
