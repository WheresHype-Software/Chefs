/**
 * Chef dashboard sections, shared by the desktop side nav and the phone menu.
 *
 * Pagamentos e Faturação só fazem sentido quando a app cobra alguma coisa. Com os pagamentos
 * desligados, pedir a um chef o NIF, a morada fiscal e o IBAN é pedir-lhe dados sensíveis para
 * dinheiro que nunca vai passar por nós — e a primeira impressão que lhe damos é a de um
 * formulário fiscal antes sequer de ter um pedido.
 */
const ALL: readonly { href: string; label: string; money?: true }[] = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/dashboard/pedidos", label: "Pedidos" },
  { href: "/dashboard/logistica", label: "Logística" },
  { href: "/dashboard/agenda", label: "Disponibilidade" },
  { href: "/dashboard/ofertas", label: "Ofertas" },
  { href: "/dashboard/avaliacoes", label: "Avaliações" },
  { href: "/dashboard/pagamentos", label: "Pagamentos", money: true },
  { href: "/dashboard/faturacao", label: "Faturação", money: true },
  { href: "/dashboard/perfil", label: "Perfil" },
];

export function dashboardNav(paymentsOn: boolean): readonly { href: string; label: string }[] {
  return paymentsOn ? ALL : ALL.filter((l) => !l.money);
}
