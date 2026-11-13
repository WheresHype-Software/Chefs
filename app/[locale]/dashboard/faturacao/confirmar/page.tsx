import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { IbanConfirmation } from "@/components/dashboard/IbanConfirmation";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/faturacao/confirmar">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "pt" | "en", namespace: "dashboard.meta" });
  return { title: t("confirmIban"), robots: { index: false } };
}

/**
 * The second half of an IBAN change. Two things have to be true at once: the one-time token from
 * the email, and a signed-in session (the dashboard is behind auth). One without the other does
 * nothing.
 */
export default async function ConfirmarIban({ searchParams }: PageProps<"/[locale]/dashboard/faturacao/confirmar">) {
  const tr = await getTranslations("dashboard.confirmIban");
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";

  return (
    <div className="flex max-w-[60ch] flex-col gap-5">
      <h1 className="d m-0 text-[clamp(28px,4vw,40px)] leading-[1.05]">{tr("title")}</h1>
      {token ? (
        <IbanConfirmation token={token} />
      ) : (
        <p className="m-0 text-muted">
          {tr.rich("incomplete", { link: (c) => <Link href="/dashboard/faturacao">{c}</Link> })}
        </p>
      )}
    </div>
  );
}
