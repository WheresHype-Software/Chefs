import type { Metadata } from "next";
import Link from "next/link";
import { IbanConfirmation } from "@/components/dashboard/IbanConfirmation";

export const metadata: Metadata = { title: "Confirmar IBAN", robots: { index: false } };

/**
 * The second half of an IBAN change. Two things have to be true at once: the one-time token from
 * the email, and a signed-in session (the dashboard is behind auth). One without the other does
 * nothing.
 */
export default async function ConfirmarIban({ searchParams }: PageProps<"/dashboard/faturacao/confirmar">) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";

  return (
    <div className="flex max-w-[60ch] flex-col gap-5">
      <h1 className="d m-0 text-[clamp(28px,4vw,40px)] leading-[1.05]">Confirmar o novo IBAN</h1>
      {token ? (
        <IbanConfirmation token={token} />
      ) : (
        <p className="m-0 text-muted">
          Esta ligação está incompleta. Abre o email que te enviámos e carrega no botão de confirmação, ou{" "}
          <Link href="/dashboard/faturacao">pede a alteração de novo</Link>.
        </p>
      )}
    </div>
  );
}
