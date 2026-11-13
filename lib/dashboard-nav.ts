/**
 * Chef dashboard sections, shared by the desktop side nav and the phone menu. Each `key` is a
 * label in messages/<locale>/dashboard.json under `nav`.
 *
 * Pagamentos e Faturação só fazem sentido quando a app cobra alguma coisa. Com os pagamentos
 * desligados, pedir a um chef o NIF, a morada fiscal e o IBAN é pedir-lhe dados sensíveis para
 * dinheiro que nunca vai passar por nós — e a primeira impressão que lhe damos é a de um
 * formulário fiscal antes sequer de ter um pedido.
 */
export type DashboardNavKey =
  | "overview"
  | "requests"
  | "logistics"
  | "availability"
  | "offers"
  | "reviews"
  | "payments"
  | "billing"
  | "profile";

const ALL: readonly { href: string; key: DashboardNavKey; money?: true }[] = [
  { href: "/dashboard", key: "overview" },
  { href: "/dashboard/pedidos", key: "requests" },
  { href: "/dashboard/logistica", key: "logistics" },
  { href: "/dashboard/agenda", key: "availability" },
  { href: "/dashboard/ofertas", key: "offers" },
  { href: "/dashboard/avaliacoes", key: "reviews" },
  { href: "/dashboard/pagamentos", key: "payments", money: true },
  { href: "/dashboard/faturacao", key: "billing", money: true },
  { href: "/dashboard/perfil", key: "profile" },
];

export function dashboardNav(paymentsOn: boolean): readonly { href: string; key: DashboardNavKey }[] {
  return paymentsOn ? ALL : ALL.filter((l) => !l.money);
}
