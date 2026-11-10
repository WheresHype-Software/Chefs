import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AprovacoesTabs } from "@/components/admin/AprovacoesTabs";
import { getAcceptanceRoster, type AcceptanceRecord, type AcceptanceRow } from "@/lib/admin/acceptances";
import { CONTRACT_VERSION } from "@/lib/contract";
import { fullStamp } from "@/lib/format";
import { getSession } from "@/lib/dashboard";
import { hasSupabase } from "@/lib/supabase/server";
import { TERMS_UPDATED } from "@/lib/terms";

export const metadata: Metadata = { title: "Contratos", robots: { index: false } };

const CONTEXT: Record<string, string> = {
  signup: "ao criar conta",
  onboarding: "ao enviar o perfil",
  dashboard: "no painel",
  billing: "em Faturação",
  legacy: "em Faturação (registo antigo)",
};

const certificate = (id: string) => `/admin/chefs/contratos/${id}/certificado`;

function Acceptance({ label, record, current }: { label: string; record: AcceptanceRecord | null; current: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      <span className="lab w-[86px] shrink-0 text-muted">{label}</span>
      {record ? (
        <>
          <span className={current ? "text-ok" : ""}>
            {record.kind === "terms" ? `versão de ${record.version}` : `versão ${record.version}`}
            {!current && " · desatualizada"}
          </span>
          <span className="text-muted">
            {fullStamp(record.accepted_at)} · {CONTEXT[record.context] ?? record.context}
            {record.email_sent_at ? " · cópia enviada" : ""}
          </span>
          <a href={certificate(record.id)} target="_blank" rel="noopener" className="font-semibold">
            Certificado
          </a>
        </>
      ) : (
        <span className="text-danger">não aceitou</span>
      )}
    </div>
  );
}

function Row({ r }: { r: AcceptanceRow }) {
  const older = r.history.filter((a) => a.id !== r.contract?.id && a.id !== r.terms?.id);
  return (
    <li
      id={`conta-${r.userId}`}
      className="flex scroll-mt-20 flex-col gap-2 border-b border-line py-3.5 target:bg-yolk-soft last:border-b-0"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold">{r.chef?.display_name ?? r.name ?? "sem nome"}</span>
        {r.chef && r.name && r.name !== r.chef.display_name && <span className="text-sm text-muted">{r.name}</span>}
        {r.email && <span className="text-sm text-muted">{r.email}</span>}
        <span className="lab ml-auto text-muted">{r.chef ? r.chef.status : "sem perfil"}</span>
      </div>
      <Acceptance label="Contrato" record={r.contract} current={r.contractCurrent} />
      <Acceptance label="Termos" record={r.terms} current={r.termsCurrent} />
      {older.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Aceitações anteriores · {older.length}</summary>
          <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
            {older.map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-3">
                <span>
                  {a.kind === "terms" ? "Termos" : "Contrato"}, {a.kind === "terms" ? `versão de ${a.version}` : `versão ${a.version}`}
                </span>
                <span className="text-muted">
                  {fullStamp(a.accepted_at)}
                  {a.revoked_at && " · revogada"}
                </span>
                <a href={certificate(a.id)} target="_blank" rel="noopener">
                  Certificado
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

/**
 * Which chefs accepted the terms and the contract, which version and when, with a printable
 * certificate for each acceptance.
 */
export default async function ContratosPage() {
  if (!hasSupabase) notFound();
  const session = await getSession();
  if (session.demo || session.role !== "admin") notFound();
  const rows = await getAcceptanceRoster();
  const upToDate = rows.filter((r) => r.contractCurrent && r.termsCurrent).length;

  return (
    <AdminShell title="Chefs">
      <AprovacoesTabs />
      <section className="box flex flex-col gap-3 p-[22px]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="d m-0 text-[22px] font-normal">Termos e contrato</h2>
          <span className="text-sm text-muted">
            Em vigor: contrato versão {CONTRACT_VERSION}, termos de {TERMS_UPDATED} · {upToDate} de {rows.length} em dia
          </span>
        </div>
        <p className="m-0 text-sm text-muted">
          Cada aceitação tem um certificado para imprimir ou guardar em PDF: quem, que texto, quando, de onde, e a declaração de que a
          aceitação eletrónica foi a forma de assinatura acordada.
        </p>
        {!rows.length && <p className="m-0 text-sm text-muted">Ainda não há contas de chef.</p>}
        <ul className="m-0 flex list-none flex-col p-0">
          {rows.map((r) => (
            <Row key={r.userId} r={r} />
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
