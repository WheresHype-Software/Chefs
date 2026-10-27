"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
  error: unknown;
  retry: () => void;
  /** Where "back" goes; the home page by default. */
  backHref?: string;
  backLabel?: string;
};

/**
 * What people see when a page fails: a plain sentence and a way forward, never the technical
 * error. The error itself goes to the browser console (server errors are logged on the server,
 * with the digest shown here so support can match them).
 */
export function ErrorState({ error, retry, backHref = "/", backLabel = "Voltar ao início" }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <div role="alert" className="flex max-w-[640px] flex-col items-start gap-4 py-10">
      <h1 className="d m-0 text-[clamp(30px,5vw,48px)] leading-[1.05]">Algo correu mal.</h1>
      <p className="m-0 text-muted">
        Não conseguimos mostrar esta página agora. Tente de novo dentro de momentos; se continuar, volte mais tarde.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => retry()}>
          Tentar de novo
        </button>
        <Link href={backHref} className="btn btn-o">
          {backLabel}
        </Link>
      </div>
      {digest && <span className="text-xs text-faint">Referência: {digest}</span>}
    </div>
  );
}
