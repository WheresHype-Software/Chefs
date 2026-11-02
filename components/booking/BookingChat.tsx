"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePolling } from "@/hooks/usePolling";
import { callAction } from "@/lib/call-action";
import { getBookingView, postMessage } from "@/lib/bookings";
import { Photo } from "@/components/ui/Photo";
import { initials, timeLabel } from "@/lib/format";
import type { BookingView, ChatMessage } from "@/lib/types";

const POLL_MS = 8000;

type Props = {
  view: BookingView;
  /** Who you're talking to ("Chef Ivo Pacheco", or the client's name for the chef). */
  title: string;
  subtitle?: string;
  photo?: string | null;
};

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 12 20 4l-6 16-3-7z" />
    </svg>
  );
}

function Bubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  if (message.sender === "system") {
    return (
      <div className="self-center rounded-[2px] bg-cobalt-soft px-3 py-[5px] text-xs text-muted [overflow-wrap:anywhere]">
        {message.body}
      </div>
    );
  }
  return (
    <div
      className={`max-w-[75%] whitespace-pre-wrap rounded-[3px] px-3.5 py-2.5 text-[15px] [overflow-wrap:anywhere] ${mine ? "self-end bg-cobalt text-white" : "self-start border border-line bg-white"}`}
    >
      {message.body}
      <span className={`mt-1 block text-[11px] ${mine ? "text-right text-[#c9d6ee]" : "text-muted"}`}>{timeLabel(message.at)}</span>
    </div>
  );
}

/** Booking conversation for the client or the chef; polls for new messages while visible. */
export function BookingChat({ view, title, subtitle, photo }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(view.messages);
  // A server refresh (e.g. after accepting the request) brings new messages: show them right away.
  const [fromServer, setFromServer] = useState(view.messages);
  if (view.messages !== fromServer) {
    setFromServer(view.messages);
    setMessages(view.messages);
  }
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const list = useRef<HTMLDivElement>(null);
  const me = view.viewer === "chef" ? "chef" : "client";
  // Only system notes so far: nobody has written yet, so say what this space is for.
  const quiet = !messages.some((m) => m.sender !== "system");
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
      const result = await callAction(() => postMessage(id, body));
      if (!result.ok) setError(true);
    });
  }

  return (
    <section aria-label="Conversa" className="box flex min-w-0 flex-col overflow-hidden">
      <div className="flex items-center gap-3.5 border-b border-line px-5 py-4">
        <span className="h-12 w-12 flex-none overflow-hidden rounded-[12px] bg-cobalt-soft" aria-hidden="true">
          {photo ? (
            <Photo photo={photo} alt="" sizes="48px" className="h-full w-full" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[17px] font-extrabold text-cobalt">{initials(title)}</span>
          )}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[13px] font-semibold text-muted">Conversa com</span>
          <strong className="truncate text-[17px] font-bold">{title}</strong>
          {subtitle && <span className="truncate text-[13px] text-ok">{subtitle}</span>}
        </div>
      </div>
      <div ref={list} className="flex h-[min(460px,62vh)] flex-col gap-3 overflow-y-auto bg-paper p-4 md:p-5" aria-live="polite">
        {messages.map((m) => (
          <Bubble key={m.id} message={m} mine={m.sender === me} />
        ))}
        {quiet && (
          <div className="mx-auto my-auto flex max-w-[34ch] flex-col items-center gap-1.5 text-center">
            <span className="text-[15px] font-semibold text-ink">Ainda sem mensagens</span>
            <span className="text-[14px] text-muted">
              Escreva aqui {me === "client" ? `ao ${title}` : "ao cliente"}: alergias, horários, morada ou o que precisar. As mensagens
              ficam guardadas nesta reserva.
            </span>
          </div>
        )}
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
        <label className="flex min-w-0 flex-auto">
          <span className="sr-only">Escrever mensagem</span>
          <input
            type="text"
            maxLength={4000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Escreva ${me === "client" ? `ao ${title}` : "ao cliente"}…`}
            className="w-full min-w-0 flex-auto rounded-[2px] border border-line-2 px-4 py-3 text-base md:text-[15px] text-ink outline-none focus:border-cobalt"
          />
        </label>
        <button type="submit" className="btn btn-sm shrink-0 gap-1.5" disabled={pending || !draft.trim()}>
          <SendIcon />
          Enviar
        </button>
      </form>
    </section>
  );
}
