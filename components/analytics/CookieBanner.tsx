"use client";

import Link from "next/link";
import { setConsent, useConsent } from "@/lib/consent";

/** Asks once whether the Meta Pixel may run. Nothing is loaded before the visitor says yes. */
export function CookieBanner() {
  const consent = useConsent();
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-[640px] flex-col gap-3 rounded-box border border-line-2 bg-white p-4 shadow-[0_12px_40px_rgba(20,32,51,0.18)] sm:flex-row sm:items-center"
    >
      <p className="m-0 flex-1 text-[14px] leading-snug text-ink-2">
        Usamos um cookie da Meta para saber se os nossos anúncios funcionam. Só o ativamos se aceitar.{" "}
        <Link href="/privacidade#cookies">Saber mais</Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn btn-sm btn-o" onClick={() => setConsent("denied")}>
          Recusar
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setConsent("granted")}>
          Aceitar
        </button>
      </div>
    </div>
  );
}
