"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { findGuestBooking } from "@/app/actions";
import { Field } from "@/components/ui/Field";
import { FormMessage, type FormMessageValue } from "@/components/ui/FormMessage";
import { callAction } from "@/lib/call-action";
import { dayLabel } from "@/lib/format";
import { readRecentBookings, type RecentBooking } from "@/lib/recent-bookings";

const EMPTY: RecentBooking[] = [];
let cache: { raw: string | null; list: RecentBooking[] } = { raw: null, list: EMPTY };

/** localStorage as an external store; the parsed list is cached so the snapshot stays stable. */
function snapshot(): RecentBooking[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("aolume:bookings");
  } catch {
    return EMPTY;
  }
  if (raw !== cache.raw) cache = { raw, list: readRecentBookings() };
  return cache.list;
}

/** Bookings made or opened on this device. */
export function RecentBookings() {
  const list = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    snapshot,
    () => EMPTY,
  );
  if (!list.length) return null;
  return (
    <section aria-labelledby="neste-dispositivo" className="flex flex-col gap-3">
      <h2 id="neste-dispositivo" className="lab m-0 border-b border-line-2 pb-2.5">
        Neste dispositivo
      </h2>
      <ul className="box m-0 list-none px-5 py-1">
        {list.map((b) => (
          <li key={b.id} className="border-b border-line last:border-b-0">
            <Link
              href={`/reserva/${b.id}`}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4 text-ink no-underline"
            >
              <span className="flex flex-col">
                <span className="d text-xl">{b.chef}</span>
                <span className="text-[13px] text-muted">
                  {b.ref} · {dayLabel(b.date)}
                </span>
              </span>
              <span className="text-sm font-semibold text-cobalt">Abrir →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Find a booking with its number and the email used to book. */
export function GuestLookupForm({ initialRef = "" }: { initialRef?: string }) {
  const router = useRouter();
  const [ref, setRef] = useState(initialRef);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<FormMessageValue | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="box flex flex-col gap-4 p-5 md:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        start(async () => {
          const result = await callAction(() => findGuestBooking({ ref, email }));
          if (result.ok) router.push(result.link);
          else setMessage({ ok: false, text: result.error });
        });
      }}
    >
      <h2 className="d m-0 text-2xl font-normal">Procurar um pedido</h2>
      <p className="m-0 text-sm text-muted">O número está no ecrã de confirmação e no email, por exemplo AL-1027-0482.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Número do pedido">
          <input
            required
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="AL-1027-0482"
            autoCapitalize="characters"
            autoComplete="off"
          />
        </Field>
        <Field label="Email usado no pedido">
          <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <FormMessage message={message} />
      <button type="submit" className="btn self-start" disabled={pending}>
        {pending ? "A procurar…" : "Ver o pedido"}
      </button>
    </form>
  );
}
