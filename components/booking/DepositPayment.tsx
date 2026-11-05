"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { usePolling } from "@/hooks/usePolling";
import { callAction } from "@/lib/call-action";
import { cancelDepositPayment, getPaymentState, refreshPaymentState, startDepositPayment, type PaymentState } from "@/lib/deposit";
import { euro } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

type Props = {
  bookingId: string;
  initial: PaymentState;
  chefFirstName: string;
  /** False on an http origin, where the provider refuses to open its card form. */
  cardAvailable: boolean;
  /** The whole booking, so the client can see what the signal is a part of. */
  bookingValue: number | null;
};

const METHODS: [PaymentMethod, string][] = [
  ["mbway", "MB WAY"],
  ["multibanco", "Referência Multibanco"],
  ["card", "Cartão"],
];

/** "4:58", or null once it has run out. */
function countdown(until: string | null, now: number): string | null {
  if (!until) return null;
  const left = Math.floor((Date.parse(until) - now) / 1000);
  if (!Number.isFinite(left) || left <= 0) return null;
  if (left > 3600) return null; // a Multibanco reference lasts days; a clock would be noise
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

function Reference({ entity, reference, amount }: { entity: string | null; reference: string | null; amount: number }) {
  const pretty = (reference ?? "").replace(/\s+/g, "").replace(/(\d{3})(?=\d)/g, "$1 ");
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2.5 rounded-[2px] bg-paper p-4">
      <dt className="lab m-0 text-muted">Entidade</dt>
      <dd className="num m-0 text-lg font-semibold">{entity}</dd>
      <dt className="lab m-0 text-muted">Referência</dt>
      <dd className="num m-0 text-lg font-semibold">{pretty}</dd>
      <dt className="lab m-0 text-muted">Valor</dt>
      <dd className="num m-0 text-lg font-semibold">{euro(amount)}</dd>
    </dl>
  );
}

/**
 * The signal, paid in the app.
 *
 * Nothing here knows how much anything costs: the amount comes from the booking, the payment is
 * opened by the server, and this screen only waits. While it waits it asks our own server how the
 * payment is doing — never the provider — so a slow or hostile answer from EuPago cannot be made
 * to look like a payment.
 */
export function DepositPayment({ bookingId, initial, chefFirstName, bookingValue, cardAvailable }: Props) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [method, setMethod] = useState<PaymentMethod>("mbway");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const payment = state.payment;
  const waiting = payment?.status === "pending" || payment?.status === "created";
  const amount = state.depositAmount ?? 0;

  // A ticking clock only while something is actually counting down.
  useEffect(() => {
    if (!waiting || payment?.method !== "mbway") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting, payment?.method]);

  useEffect(() => {
    const outcome = new URLSearchParams(window.location.search).get("pagamento");
    if (!outcome) return;
    // Tidy the address bar, then confirm with the provider rather than trust the redirect.
    window.history.replaceState(null, "", window.location.pathname);
    void (async () => {
      if (outcome === "ok") await checkNow();
      else if (outcome === "falhou") setError("O pagamento com cartão não foi aceite. Pode tentar de novo.");
    })();
    // Runs once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePolling(
    async () => {
      const fresh = await getPaymentState(bookingId);
      if (!fresh) return;
      setState(fresh);
      // Paid: the page above this one has to change too (status, steps, chat).
      if (fresh.depositStatus === "paid") router.refresh();
    },
    payment?.method === "mbway" ? 4000 : 15000,
    waiting,
  );

  if (state.depositStatus === "paid") return null;
  if (!["due", "pending", "overdue"].includes(state.depositStatus)) return null;

  async function start() {
    setBusy(true);
    setError(null);
    const result = await callAction(() => startDepositPayment(bookingId, method, phone));
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setState(result.state);
    setNow(Date.now());
    const url = result.state.payment?.redirectUrl;
    if (url) window.location.href = url;
  }

  // Coming back from the card form, or simply impatient: ask the provider rather than wait for
  // the notification to arrive.
  async function checkNow() {
    setBusy(true);
    setError(null);
    try {
      const fresh = await refreshPaymentState(bookingId);
      if (fresh) {
        setState(fresh);
        if (fresh.depositStatus === "paid") router.refresh();
      }
    } catch (err) {
      console.error("[deposit] checkNow:", err);
      setError("Não conseguimos confirmar agora. Tente dentro de momentos.");
    } finally {
      setBusy(false);
    }
  }

  async function startOver() {
    setBusy(true);
    await callAction(() => cancelDepositPayment(bookingId));
    const fresh = await getPaymentState(bookingId);
    if (fresh) setState(fresh);
    setBusy(false);
  }

  const left = countdown(payment?.expiresAt ?? null, now);
  const rest = bookingValue == null ? null : Math.round((bookingValue - amount) * 100) / 100;

  const summary = (
    <aside className="flex min-w-0 flex-[1_1_230px] flex-col gap-3 bg-paper p-5">
      <span className="lab text-muted">Resumo</span>
      <dl className="m-0 flex flex-col gap-2.5">
        {bookingValue != null && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="m-0 text-[15px] text-muted">Valor do serviço</dt>
            <dd className="num m-0 text-[15px]">{euro(bookingValue)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 border-t border-line-2 pt-2.5">
          <dt className="m-0 text-[15px] font-semibold">A pagar agora</dt>
          <dd className="num m-0 text-[22px] font-semibold text-cobalt">{euro(amount)}</dd>
        </div>
        {rest != null && rest > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="m-0 text-[15px] text-muted">Depois, ao chef</dt>
            <dd className="num m-0 text-[15px]">{euro(rest)}</dd>
          </div>
        )}
      </dl>
      <p className="m-0 text-[13px] leading-relaxed text-muted">
        O sinal garante a data. O restante valor é combinado e pago diretamente a {chefFirstName}, no dia do serviço.
      </p>
    </aside>
  );

  return (
    <section className="box flex flex-col gap-4 border-2 border-cobalt p-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="d m-0 text-[28px]">Falta o sinal</h2>
        <p className="m-0 text-muted">
          {chefFirstName} aceitou o pedido. Pague o sinal de <strong className="num font-semibold text-ink">{euro(amount)}</strong> para a
          reserva ficar confirmada. O resto do valor combina diretamente com {chefFirstName}, no dia.
        </p>
        {state.depositStatus === "overdue" && (
          <p className="m-0 text-sm text-danger">O prazo para pagar o sinal passou. Ainda pode pagar, mas o chef já pode ter cancelado.</p>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
          {!waiting && (
            <>
              <div className="flex flex-wrap gap-2.5" role="group" aria-label="Como quer pagar">
                {METHODS.filter(([m]) => m !== "card" || cardAvailable).map(([m, label]) => (
                  <button key={m} type="button" className="chip" aria-pressed={method === m} onClick={() => setMethod(m)} disabled={busy}>
                    {label}
                  </button>
                ))}
              </div>

              <form
                className="flex flex-col gap-3.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void start();
                }}
              >
                {method === "mbway" && (
                  <Field label="Telemóvel do MB WAY" required hint="Recebe um pedido na aplicação para aprovar em 5 minutos.">
                    <input
                      required
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={20}
                      placeholder="912 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </Field>
                )}
                {method === "multibanco" && (
                  <p className="m-0 text-sm text-muted">
                    Geramos uma entidade e referência para pagar no homebanking ou numa caixa Multibanco.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4">
                  <button className="btn" disabled={busy}>
                    {busy ? "A preparar…" : `Pagar ${euro(amount)}`}
                  </button>
                  {error && <FormMessage message={{ ok: false, text: error }} />}
                </div>
              </form>
            </>
          )}

          {waiting && payment?.method === "mbway" && (
            <div className="flex flex-col gap-3">
              <p className="m-0">
                Abra a aplicação MB WAY no número {payment.phoneMasked} e aprove o pagamento de {euro(payment.amount)}.
              </p>
              <p className="m-0 flex items-baseline gap-2.5 text-sm text-muted">
                <span className="num text-2xl text-ink">{left ?? "—"}</span>
                <span>{left ? "para aprovar" : "o pedido expirou"}</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button type="button" className="btn btn-o btn-sm" onClick={() => void startOver()} disabled={busy}>
                  {left ? "Pagar de outra forma" : "Tentar de novo"}
                </button>
              </div>
            </div>
          )}

          {waiting && payment?.method === "card" && (
            <div className="flex flex-col gap-3">
              <p className="m-0">Abrimos a página segura da EuPago para pagar {euro(payment.amount)} com cartão.</p>
              <div className="flex flex-wrap gap-2.5">
                {payment.redirectUrl && (
                  <a href={payment.redirectUrl} className="btn btn-sm">
                    Continuar o pagamento
                  </a>
                )}
                <button type="button" className="btn btn-o btn-sm" onClick={() => void checkNow()} disabled={busy}>
                  {busy ? "A verificar…" : "Já paguei, verificar"}
                </button>
                <button type="button" className="btn btn-o btn-sm" onClick={() => void startOver()} disabled={busy}>
                  Pagar de outra forma
                </button>
              </div>
            </div>
          )}

          {waiting && payment?.method === "multibanco" && (
            <div className="flex flex-col gap-3">
              <Reference entity={payment.entity} reference={payment.reference} amount={payment.amount} />
              <p className="m-0 text-sm text-muted">
                Enviámos-lhe estes dados por email. A reserva fica confirmada automaticamente assim que o pagamento entrar. Pode fechar esta
                página.
              </p>
              <button type="button" className="btn btn-o btn-sm self-start" onClick={() => void startOver()} disabled={busy}>
                Pagar de outra forma
              </button>
            </div>
          )}
        </div>
        {summary}
      </div>

      <p className="m-0 text-xs text-muted">
        O pagamento é processado pela EuPago. O Ao Lume recebe o sinal em nome do chef e transfere-lho depois do serviço.
      </p>
    </section>
  );
}
