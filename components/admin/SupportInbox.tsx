"use client";

import { useState } from "react";
import { replyToTicket, setTicketStatus } from "@/app/admin/apoio/actions";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { shortStamp } from "@/lib/format";

export type Ticket = {
  id: string;
  ref: string;
  name: string;
  email: string;
  phone: string | null;
  category: string;
  booking_ref: string | null;
  subject: string;
  status: "open" | "answered" | "closed";
  created_at: string;
  messages: { id: string; author: "person" | "team"; body: string; created_at: string }[];
};

const CATEGORY: Record<string, string> = {
  reserva: "Reserva",
  pagamento: "Pagamento",
  conta: "Conta",
  chef: "Chef",
  outro: "Outro",
};

const STATUS: Record<string, string> = { open: "Por responder", answered: "Respondida", closed: "Fechada" };

/** The inbox. Each thread opens in place, with the reply box at the end of it. */
export function SupportInbox({ tickets }: { tickets: Ticket[] }) {
  const [open, setOpen] = useState<string | null>(tickets.find((t) => t.status === "open")?.id ?? null);
  const [reply, setReply] = useState("");
  const answer = useServerAction(replyToTicket, { successMessage: "Resposta enviada.", onSuccess: () => setReply("") });
  const status = useServerAction(setTicketStatus, { successMessage: "Guardado." });

  if (!tickets.length) return <p className="m-0 text-muted">Nenhuma mensagem.</p>;

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {tickets.map((t) => {
        const isOpen = open === t.id;
        return (
          <li key={t.id} className="box flex flex-col gap-3 p-5">
            <button
              type="button"
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-0 bg-transparent p-0 text-left"
              onClick={() => setOpen(isOpen ? null : t.id)}
            >
              <span className="num font-semibold">{t.ref}</span>
              <span className="font-semibold">{t.subject}</span>
              <span className="text-sm text-muted">
                {t.name} · {CATEGORY[t.category] ?? t.category}
                {t.booking_ref ? ` · ${t.booking_ref}` : ""}
              </span>
              <span className="lab ml-auto text-muted">{STATUS[t.status]}</span>
              <span className="text-[13px] text-muted">{shortStamp(t.created_at)}</span>
            </button>

            {isOpen && (
              <>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                  <a href={`mailto:${t.email}`}>{t.email}</a>
                  {t.phone && <span>{t.phone}</span>}
                </div>

                <ol className="m-0 flex list-none flex-col gap-3 p-0">
                  {t.messages.map((m) => (
                    <li
                      key={m.id}
                      className={`flex flex-col gap-1 rounded-[2px] p-3.5 ${m.author === "team" ? "bg-paper" : "border border-line"}`}
                    >
                      <span className="lab text-muted">
                        {m.author === "team" ? "Ao Lume" : t.name} · {shortStamp(m.created_at)}
                      </span>
                      <p className="m-0 whitespace-pre-wrap text-sm">{m.body}</p>
                    </li>
                  ))}
                </ol>

                <form
                  className="flex flex-col gap-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    answer.run({ ticketId: t.id, body: reply });
                  }}
                >
                  <label className="field lab">
                    <span>Resposta</span>
                    <textarea required rows={4} maxLength={8000} value={reply} onChange={(e) => setReply(e.target.value)} />
                    <span className="hint">
                      Vai por email para {t.email} com a referência {t.ref}.
                    </span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="btn btn-sm" disabled={answer.pending || reply.trim().length < 2}>
                      {answer.pending ? "A enviar…" : "Responder"}
                    </button>
                    {t.status !== "closed" ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-o"
                        disabled={status.pending}
                        onClick={() => status.run(t.id, "closed")}
                      >
                        Fechar
                      </button>
                    ) : (
                      <button type="button" className="btn btn-sm btn-o" disabled={status.pending} onClick={() => status.run(t.id, "open")}>
                        Reabrir
                      </button>
                    )}
                    <FormMessage message={answer.message ?? status.message} />
                  </div>
                </form>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
