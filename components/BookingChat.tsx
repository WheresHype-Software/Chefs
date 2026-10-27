"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getBookingView, postMessage } from "@/lib/bookings";
import { timeLabel } from "@/lib/format";
import type { BookingView, ChatMessage } from "@/lib/types";

type Props = {
  view: BookingView;
  token?: string | null;
  title: string;
  subtitle?: string;
};

/** Booking conversation. Polls for new messages; works for guests (token) and signed-in users. */
export function BookingChat({ view, token, title, subtitle }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(view.messages);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const list = useRef<HTMLDivElement>(null);
  const me = view.viewer === "chef" ? "chef" : "client";
  const id = view.booking.id;

  useEffect(() => {
    if (id === "demo") return;
    const t = setInterval(async () => {
      if (document.hidden) return;
      const v = await getBookingView(id, token);
      if (v) setMessages(v.messages);
    }, 8000);
    return () => clearInterval(t);
  }, [id, token]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages.length]);

  function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, sender: me, body, at: new Date().toISOString() }]);
    start(async () => {
      await postMessage(id, body, token);
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
        {messages.map((m) =>
          m.sender === "system" ? (
            <div key={m.id} className="self-center rounded-[2px] bg-[#F1EDE6] px-3 py-[5px] text-xs text-muted">
              {m.body}
            </div>
          ) : m.sender === me ? (
            <div key={m.id} className="max-w-[75%] self-end rounded-[3px] bg-ink px-3.5 py-2.5 text-[15px] text-white">
              {m.body}
              <span className="mt-1 block text-right text-[11px] text-[#CFC8BE]">{timeLabel(m.at)}</span>
            </div>
          ) : (
            <div key={m.id} className="max-w-[75%] self-start rounded-[3px] border border-line bg-white px-3.5 py-2.5 text-[15px]">
              {m.body}
              <span className="mt-1 block text-[11px] text-muted">{timeLabel(m.at)}</span>
            </div>
          ),
        )}
      </div>
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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva uma mensagem…"
            className="flex-auto rounded-[2px] border border-line-2 px-4 py-3 text-[15px] text-ink outline-none focus:border-ink"
          />
        </label>
        <button type="submit" className="btn btn-sm" disabled={pending || !draft.trim()}>
          Enviar
        </button>
      </form>
    </section>
  );
}
