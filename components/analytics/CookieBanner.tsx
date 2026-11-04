"use client";

import Link from "next/link";
import { setConsent, useConsent } from "@/lib/consent";

/**
 * Asks once whether the Meta Pixel may run. Nothing is loaded before the visitor says yes, and
 * refusing is the same single tap as accepting, in the same place.
 */
export function CookieBanner() {
  const consent = useConsent();
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookies"
      aria-labelledby="cookies-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-[720px] flex-col gap-4 rounded-box border border-line-2 bg-white p-4 shadow-[0_12px_40px_rgba(20,32,51,0.18)] sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="cookies-title" className="m-0 text-[16px] font-bold leading-snug">
          Cookies
        </h2>
        <p className="m-0 text-[14px] leading-relaxed text-ink-3">
          Usamos cookies essenciais para o site funcionar. Com a sua autorização, usamos também cookies da Meta para medir os nossos
          anúncios no Facebook e no Instagram. Pode mudar de ideias a qualquer momento.{" "}
          <Link href="/privacidade#cookies" className="underline">
            Saber mais
          </Link>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn btn-sm btn-o flex-1 sm:flex-none" onClick={() => setConsent("denied")}>
          Recusar
        </button>
        <button type="button" className="btn btn-sm flex-1 sm:flex-none" onClick={() => setConsent("granted")}>
          Aceitar
        </button>
      </div>
    </div>
  );
}
