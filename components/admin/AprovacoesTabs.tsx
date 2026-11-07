import { AdminTabs } from "@/components/admin/AdminTabs";
import { getPendingChefs, getReportedReviews, getRoster, getTitleRequests } from "@/lib/admin/queues";

/** As secções das aprovações, com o que está à espera de uma decisão. */
export async function AprovacoesTabs() {
  const [pending, titles, reports, roster] = await Promise.all([getPendingChefs(), getTitleRequests(), getReportedReviews(), getRoster()]);
  return (
    <AdminTabs
      tabs={[
        { href: "/admin", label: "Perfis por aprovar", count: pending.length },
        { href: "/admin/titulos", label: "Títulos de Chef", count: titles.length },
        { href: "/admin/denuncias", label: "Denúncias", count: reports.length },
        { href: "/admin/chefs", label: "Chefs", count: roster.chefs.filter((c) => c.status === "approved").length },
      ]}
    />
  );
}
