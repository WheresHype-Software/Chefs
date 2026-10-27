"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePolling } from "@/hooks/usePolling";
import { getBookingView, postMessage } from "@/lib/bookings";
import { timeLabel } from "@/lib/format";
import type { BookingView, ChatMessage } from "@/lib/types";

const POLL_MS = 8000;

type Props = { view: BookingView; title: string; subtitle?: string };

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  if (message.sender === "system") {
    return <div className="self-center rounded-[2px] bg-[#F1EDE6] px-3 py-[5px] text-xs text-muted">{message.body}</div>;
  }
  return (
    <div
      className={`max-w-[75%] rounded-[3px] px-3.5 py-2.5 text-[15px] ${mine ? "self-end bg-cobalt text-white" : "self-start border border-line bg-white"}`}
    >
      {message.body}
      <span className={`mt-1 block text-[11px] ${mine ? "text-right text-[#CFC8BE]" : "text-muted"}`}>{timeLabel(message.at)}</span>
    </div>
  );
}

/** Booking conversation for the client or the chef; polls for new messages while visible. */
export function BookingChat({ view, title, subtitle }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(view.messages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const list = useRef<HTMLDivElement>(null);
  const me = view.viewer === "chef" ? "chef" : "client";
  const id = view.booking.id;

  usePolling(
    async () => {
      const fresh = await getBookingView(id);
      if (fresh) setMessages(fresh.messages);
    },
    POLL_MS,
    id !== "demo",
  );

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages.length]);

  function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    setError(false);
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, sender: me, body, at: new Date().toISOString() }]);
    startTransition(async () => {
      const result = await postMessage(id, body);
      if (!result.ok) setError(true);
    });
  }

  return (
    <section aria-label="Conversa" className="box flex min-w-0 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="h-10 w-10 flex-none rounded-full bg-[#D8CBBB]" aria-hidden="true" />
        <div className="flex flex-col">
          <strong className="font-semibold">{title}</strong>
          {subtitle && <span className="text-[13px] text-ok">{subtitle}</span>}
        </div>
      </div>
      <div ref={list} className="flex h-[460px] flex-col gap-3 overflow-y-auto bg-[#FCFBF9] p-5" aria-live="polite">
        {messages.map((m) => (
          <Bubble key={m.id} message={m} mine={m.sender === me} />
        ))}
      </div>
      {error && (
        <p role="alert" className="m-0 border-t border-line px-5 py-2 text-sm text-danger">
          A última mensagem não foi enviada. Tente de novo.
        </p>
      )}
      <form
        className="flex items-center gap-2.5 border-t border-line p-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label className="flex flex-auto">
          <span className="sr-only">Escrever mensagem</span>
          <input
            type="text"
            maxLength={4000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva uma mensagem…"
            className="flex-auto rounded-[2px] border border-line-2 px-4 py-3 text-[15px] text-ink outline-none focus:border-cobalt"
          />
        </label>
        <button type="submit" className="btn btn-sm" disabled={pending || !draft.trim()}>
          Enviar
        </button>
      </form>
    </section>
  );
}
