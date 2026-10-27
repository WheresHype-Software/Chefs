import Link from "next/link";
import type { MyChef, SetupProgress } from "@/lib/dashboard";

type Step = { title: string; text: string; href: string; action: string; done: boolean };

function steps(chef: MyChef, p: SetupProgress): Step[] {
  const sent = chef.status === "pending" || chef.status === "approved";
  return [
    {
      title: "Fotografias",
      text: "Uma fotografia sua e pelo menos três dos seus pratos, com descrição.",
      href: "/dashboard/fotos",
      action: "Carregar fotografias",
      done: p.profilePhoto && p.dishPhotos >= 3,
    },
    {
      title: "Crie uma oferta",
      text: "Um menu, uma caixa ou uma encomenda, com preço. É o que os clientes reservam.",
      href: "/dashboard/ofertas",
      action: "Criar oferta",
      done: p.activeOffers > 0,
    },
    {
      title: "Abra dias na agenda",
      text: "Os clientes só podem pedir reserva nos dias que abrir. Pode abrir já os dias da semana em que costuma cozinhar.",
      href: "/dashboard/agenda",
      action: "Abrir dias",
      done: p.openDays > 0,
    },
    {
      title: "Envie para revisão",
      text:
        chef.status === "rejected"
          ? `Pedimos alterações: ${chef.verification_notes ?? "veja o email que enviámos."}`
          : "A equipa confirma as fotografias e o perfil fica público.",
      href: "/dashboard/perfil",
      action: chef.status === "rejected" ? "Rever e reenviar" : "Enviar para revisão",
      done: sent,
    },
  ];
}

/**
 * "Primeiros passos": what is left before clients can book, in order, with the next step
 * highlighted. Hidden once the chef is approved and bookable.
 */
export function SetupChecklist({ chef, progress }: { chef: MyChef; progress: SetupProgress }) {
  const list = steps(chef, progress);
  const done = list.filter((s) => s.done).length;
  if (done === list.length && chef.status === "approved") return null;
  const next = list.find((s) => !s.done);
  const waiting = !next && chef.status === "pending";

  return (
    <section aria-labelledby="setup-title" className="box flex flex-col gap-5 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="setup-title" className="d m-0 text-2xl font-normal">
          {waiting ? "O seu perfil está em revisão" : chef.status === "approved" ? "Falta pouco para receber reservas" : "Primeiros passos"}
        </h2>
        <span className="text-sm text-muted">
          {done} de {list.length}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-paper" aria-hidden="true">
        <div
          className="h-full rounded-full bg-cobalt transition-[width] duration-500"
          style={{ width: `${(done / list.length) * 100}%` }}
        />
      </div>
      {waiting && <p className="m-0 text-muted">A equipa responde por email. Entretanto pode afinar as ofertas e a agenda.</p>}
      <ol className="m-0 flex list-none flex-col p-0">
        {list.map((s) => {
          const current = s === next;
          return (
            <li key={s.title} className="flex items-start gap-3.5 border-t border-line py-3.5 first:border-t-0">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  s.done ? "bg-cobalt text-white" : current ? "border-2 border-cobalt text-cobalt" : "border border-line-3 text-faint"
                }`}
              >
                {s.done ? "✓" : ""}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={`font-semibold ${s.done ? "text-muted line-through decoration-1" : ""}`}>
                  {s.title}
                  <span className="sr-only">{s.done ? ": feito" : current ? ": próximo passo" : ""}</span>
                </span>
                {!s.done && <span className="text-sm text-muted">{s.text}</span>}
                {current && (
                  <Link href={s.href} className="btn btn-sm mt-1.5 self-start">
                    {s.action}
                  </Link>
                )}
              </div>
              {!s.done && !current && (
                <Link href={s.href} className="text-sm font-semibold">
                  Abrir
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
