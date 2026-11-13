import { getLocale, getTranslations } from "next-intl/server";
import type { PayoutDocumentRow } from "@/lib/dashboard";
import { euro, shortStamp } from "@/lib/format";

/**
 * The documents that came with each payment: what was paid, against which booking, with the
 * chef's fiscal data and our commission shown apart.
 *
 * There is no "I agree" button here. The contract the chef accepted already says each payment
 * comes with one of these and that it is agreed by that contract, so a second click added
 * nothing to the record while implying the document was somehow pending until it was given.
 * What the chef actually needs is a copy to keep, which is the download.
 */
export async function PayoutDocuments({ documents }: { documents: PayoutDocumentRow[] }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard.payments.documents");
  if (!documents.length) {
    return (
      <section className="box flex flex-col gap-2 p-[22px]">
        <h2 className="d m-0 text-[22px] font-normal">{t("title")}</h2>
        <p className="m-0 text-sm text-muted">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section className="box flex flex-col gap-3.5 p-[22px]">
      <h2 className="d m-0 text-[22px] font-normal">{t("title")}</h2>
      <p className="m-0 text-sm text-muted">{t("intro")}</p>
      <ul className="m-0 flex list-none flex-col p-0">
        {documents.map((d) => (
          <li key={d.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b border-line py-3 last:border-b-0">
            <a href={`/api/payments/document/${d.id}`} target="_blank" rel="noopener" className="num font-semibold">
              {d.number}
            </a>
            <span className="num text-sm text-muted">{euro(d.amount, locale)}</span>
            {d.bookingRef && <span className="text-sm text-muted">· {d.bookingRef}</span>}
            <span className="text-sm text-muted">· {shortStamp(d.issued_at, locale)}</span>
            {d.status === "void" ? (
              <span className="ml-auto text-sm text-muted">{t("void")}</span>
            ) : (
              <a href={`/api/payments/document/${d.id}?download=1`} className="btn btn-sm btn-o ml-auto no-underline" download>
                {t("download")}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
