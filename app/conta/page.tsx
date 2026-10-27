import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSession } from "@/lib/dashboard";
import { dayLabel, STATUS_LABEL } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types";

type Row = {
  id: string;
  ref: string;
  status: BookingStatus;
  offer_title: string;
  date: string;
  guests: number;
  chefs: { display_name: string } | null;
};

const OPEN: BookingStatus[] = ["requested", "accepted", "change_proposed", "confirmed"];

/** The signed-in client's bookings (RLS returns only their own), upcoming first. */
export default async function MinhasReservas() {
  // Demo mode has no client accounts: show the sample chef dashboard instead.
  if ((await getSession()).demo) redirect("/dashboard");
  const sb = await createClient();
  const { data } = await sb
    .from("bookings")
    .select("id, ref, status, offer_title, date, guests, chefs(display_name)")
    .order("date", { ascending: true });
  const rows = (data ?? []) as unknown as Row[];
  const upcoming = rows.filter((b) => OPEN.includes(b.status));
  const past = rows.filter((b) => !OPEN.includes(b.status)).reverse();

  return (
    <>
      <PageHeader title="As minhas reservas" description="Abra uma reserva para ver o estado e falar com o chef." />
      {rows.length === 0 ? (
        <div className="box flex flex-col items-start gap-3 p-6">
          <span className="text-muted">Ainda não tem reservas.</span>
          <Link href="/procurar" className="btn">
            Encontrar um chef
          </Link>
        </div>
      ) : (
        <>
          <BookingList title="Próximas" rows={upcoming} empty="Sem reservas marcadas." />
          {past.length > 0 && <BookingList title="Anteriores" rows={past} />}
        </>
      )}
    </>
  );
}

function BookingList({ title, rows, empty }: { title: string; rows: Row[]; empty?: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="lab m-0 border-b border-line-2 pb-2.5">
        {title} · {rows.length}
      </h2>
      {rows.length === 0 && empty ? <span className="text-muted">{empty}</span> : null}
      {rows.length > 0 && (
        <ul className="box m-0 list-none px-5 py-1 md:px-6">
          {rows.map((b) => (
            <li key={b.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/reserva/${b.id}`}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4 text-ink no-underline"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="d text-xl">{b.chefs?.display_name ?? "Chef"}</span>
                  <span className="text-[13px] text-muted">
                    {b.offer_title} · {b.guests} · {dayLabel(b.date)}
                  </span>
                </span>
                <span className="lab text-muted">{STATUS_LABEL[b.status]} →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
