/** Chef dashboard sections, shared by the desktop side nav and the phone menu. */
export const DASHBOARD_NAV: readonly { href: string; label: string }[] = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/dashboard/pedidos", label: "Pedidos" },
  { href: "/dashboard/logistica", label: "Logística" },
  { href: "/dashboard/agenda", label: "Agenda" },
  { href: "/dashboard/ofertas", label: "Ofertas" },
  { href: "/dashboard/cozinha", label: "Cozinha e serviços" },
  { href: "/dashboard/avaliacoes", label: "Avaliações" },
  { href: "/dashboard/perfil", label: "Perfil" },
  { href: "/dashboard/fotos", label: "Fotografias" },
];
