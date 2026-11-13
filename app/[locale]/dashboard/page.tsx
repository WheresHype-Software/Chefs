import { Link } from "@/lib/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGrid } from "@/components/ui/StatGrid";
import { redirectLocalized } from "@/lib/i18n/server";
import { LegalAcceptanceCard } from "@/components/dashboard/LegalAcceptanceCard";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { myAcceptance } from "@/lib/acceptance";
import { getBookings, getChefMoney, getMyChef, getPayouts, getSession, getSetupProgress } from "@/lib/dashboard";
import { dayLabel, euro, isoDay, longDay, rating } from "@/lib/format";

export default async function Overview() {
  const session = await getSession();
  const chef = await getMyChef();
  if (!chef) {
    // Admins without their own chef page belong in the admin area; clients never get here (layout).
    return redirectLocalized(session.role === "admin" ? "/admin" : "/dashboard/comecar");
  }
  // Até o perfil seguir para revisão, o painel é o caminho até lá: quem entra cai no passo onde ficou.
  if (chef.status === "draft" || chef.status === "rejected") return redirectLocalized("/dashboard/comecar");

  const today = isoDay(new Date());
  const in7 = new Date();
  in7.setDate(in7.getDate() + 6);
  const [requests, week, progress, money] = await Promise.all([
    getBookings({ statuses: ["requested"] }),
    getBookings({ from: today, to: isoDay(in7), statuses: ["accepted", "confirmed"] }),
    getSetupProgress(),
    getChefMoney(),
  ]);
  // A new version of the terms or the contract waits here until the chef accepts it.
  const legal = session.demo || !session.userId ? { terms: true, contract: true } : await myAcceptance(session.userId);
  const toAccept = [...(legal.terms ? [] : ["terms" as const]), ...(legal.contract ? [] : ["chef_contract" as const])];
  // Only worth a query once there is money to show.
  const payouts = money ? await getPayouts() : null;
  const byDay = new Map<string, number>();
  week.forEach((b) => byDay.set(b.date, (byDay.get(b.date) ?? 0) + 1));
  const busiest = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const busiestItems = busiest ? week.filter((b) => b.date === busiest[0]) : [];

  return (
    <div className="flex flex-col gap-6">
      {toAccept.length > 0 && (
        <LegalAcceptanceCard
          kinds={toAccept}
          context="dashboard"
          title={toAccept.includes("chef_contract") ? "Há uma nova versão do contrato" : "Os termos foram atualizados"}
          intro={
            toAccept.includes("chef_contract")
              ? "Leia e aceite para continuar a usar o Ao Lume. O contrato diz, entre outras coisas, que o serviço, a segurança alimentar e as licenças são da sua responsabilidade, e que esta aceitação vale como a sua assinatura."
              : "Leia os termos atualizados e aceite para continuar a usar o Ao Lume."
          }
        />
      )}
      <SetupChecklist chef={chef} progress={progress} />

      <PageHeader meta={longDay(today)} title={`Olá, ${chef.display_name.split(" ")[0]}`} />

      <StatGrid
        items={[
          ["Pedidos por responder", String(requests.length)],
          ["Serviços esta semana", String(week.length)],
          ["Entregas", String(week.filter((b) => b.fulfilment_mode === "delivery").length)],
          ["Avaliação", rating(chef.rating_avg, chef.review_count).replace("★ ", "")],
        ]}
      />

      {money && payouts && (
        <section aria-labelledby="dinheiro" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="dinheiro" className="lab m-0 text-muted">
              Dinheiro
            </h2>
            <Link href="/dashboard/pagamentos" className="text-sm">
              Ver pagamentos
            </Link>
          </div>
          <StatGrid
            size="md"
            // Only money coming in. A yearly commission total would be the one figure that makes
            // a small percentage feel like a bill, and the chef can see it per booking anyway,
            // on the booking itself and on the document that comes with each payment.
            items={[
              ["A receber de nós", euro(payouts.summary.balance)],
              ["Clientes devem-te", euro(money.restOwed)],
              ["Recebido de nós este ano", euro(payouts.summary.paidThisYear)],
              ["Recebido dos clientes este ano", euro(money.restPaid)],
            ]}
          />
          {(money.awaitingDeposit > 0 || money.restToConfirm > 0) && (
            <p className="m-0 text-sm text-muted">
              {money.awaitingDeposit > 0 &&
                `${money.awaitingDeposit} ${money.awaitingDeposit === 1 ? "reserva à espera" : "reservas à espera"} do sinal. `}
              {money.restToConfirm > 0 &&
                `${money.restToConfirm} ${money.restToConfirm === 1 ? "reserva por confirmar" : "reservas por confirmar"} se o cliente já te pagou o resto.`}
            </p>
          )}
        </section>
      )}

      {requests.length > 0 && (
        <section className="box flex flex-col p-6">
          <div className="flex items-baseline justify-between border-b border-line-2 pb-3">
            <h2 className="d m-0 text-2xl">Novos pedidos</h2>
            <Link href="/dashboard/pedidos" className="text-sm">
              Ver todos →
            </Link>
          </div>
          {requests.slice(0, 4).map((b) => (
            <Link
              key={b.id}
              href={`/dashboard/pedidos/${b.id}`}
              className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line py-4 text-ink no-underline last:border-b-0"
            >
              <span className="flex flex-col">
                <span className="d text-xl">{b.client?.name ?? "Cliente"}</span>
                <span className="text-[13px] text-muted">
                  {b.offer_title} · {b.guests} · {dayLabel(b.date)}
                </span>
              </span>
              <span className="lab rounded-[2px] bg-cobalt px-2.5 py-1.5 text-white">Responder</span>
            </Link>
          ))}
        </section>
      )}

      {busiest && (
        <div className="box flex flex-wrap items-center justify-between gap-4 p-6">
          <span className="flex flex-col gap-1">
            <span className="d text-2xl">{longDay(busiest[0]).split(",")[0]} é o seu dia mais cheio</span>
            <span className="text-muted">
              {busiestItems.length} {busiestItems.length === 1 ? "serviço" : "serviços"}:{" "}
              {busiestItems.map((b) => `${b.time_label ?? ""} ${b.offer_title}`.trim()).join(" · ")}
            </span>
          </span>
          <Link href={`/dashboard/logistica?dia=${busiest[0]}`} className="btn">
            Ver logística do dia
          </Link>
        </div>
      )}
    </div>
  );
}
