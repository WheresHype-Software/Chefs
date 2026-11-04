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
          Utilizamos cookies
        </h2>
        <p className="m-0 text-[14px] leading-relaxed text-ink-3">
          Utilizamos cookies necessários ao funcionamento do site e, com a sua autorização, cookies da Meta para medir a eficácia dos nossos
          anúncios no Facebook e no Instagram. Pode mudar a sua escolha a qualquer momento.{" "}
          <Link href="/privacidade#cookies" className="underline">
            Saiba mais
          </Link>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn btn-sm btn-o flex-1 sm:w-[112px] sm:flex-none" onClick={() => setConsent("denied")}>
          Rejeitar
        </button>
        <button type="button" className="btn btn-sm btn-o flex-1 sm:w-[112px] sm:flex-none" onClick={() => setConsent("granted")}>
          Aceitar
        </button>
      </div>
    </div>
  );
}
