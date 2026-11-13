import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { MyChef, SetupProgress } from "@/lib/dashboard";

type StepKey = "photos" | "offer" | "days" | "review" | "billing";
type StepState = { key: StepKey; href: string; done: boolean; rejected?: boolean };
type Step = { title: string; text: string; href: string; action: string; done: boolean };

/** The first-steps, as done flags and keys — no copy, so it works without a translator. */
function stepStates(chef: MyChef, p: SetupProgress): StepState[] {
  const sent = chef.status === "pending" || chef.status === "approved";
  return [
    { key: "photos", href: "/dashboard/perfil#fotografias", done: p.profilePhoto && p.dishPhotos >= 3 },
    { key: "offer", href: "/dashboard/ofertas", done: p.activeOffers > 0 },
    { key: "days", href: "/dashboard/agenda", done: p.openDays > 0 },
    { key: "review", href: "/dashboard/comecar?passo=3", done: sent, rejected: chef.status === "rejected" },
    // Only once payments are on: before that there is nothing to pay and nothing to ask for.
    ...(p.billing === "off" ? [] : [{ key: "billing" as const, href: "/dashboard/faturacao", done: p.billing === "done" }]),
  ];
}

/** Every first step done: from here on the dashboard stops guiding (no checklist, no Lumi). */
export function setupComplete(chef: MyChef, progress: SetupProgress): boolean {
  return stepStates(chef, progress).every((s) => s.done);
}

/**
 * "Primeiros passos": what is left before clients can book, in order, with the next step
 * highlighted. Hidden once the chef is approved and bookable.
 */
export async function SetupChecklist({ chef, progress }: { chef: MyChef; progress: SetupProgress }) {
  const t = await getTranslations("dashboard.setup");
  const list: Step[] = stepStates(chef, progress).map((s) => ({
    href: s.href,
    done: s.done,
    title: t(`${s.key}.title`),
    text:
      s.key === "review" && s.rejected
        ? t("review.textRejected", { notes: chef.verification_notes ?? t("review.seeEmail") })
        : t(`${s.key}.text`),
    action: s.key === "review" && s.rejected ? t("review.actionRejected") : t(`${s.key}.action`),
  }));
  const done = list.filter((s) => s.done).length;
  if (done === list.length && chef.status === "approved") return null;
  const next = list.find((s) => !s.done);
  const waiting = !next && chef.status === "pending";
  // Bookable already, and the only thing left is the paperwork that lets us pay them.
  const onlyBilling = chef.status === "approved" && list.filter((s) => !s.done).length === 1 && next?.href === "/dashboard/faturacao";

  return (
    <section aria-labelledby="setup-title" className="box flex flex-col gap-5 p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="setup-title" className="d m-0 text-2xl font-normal">
          {waiting
            ? t("headingWaiting")
            : onlyBilling
              ? t("headingOnlyBilling")
              : chef.status === "approved"
                ? t("headingApproved")
                : t("heading")}
        </h2>
        <span className="text-sm text-muted">{t("progress", { done, total: list.length })}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-paper" aria-hidden="true">
        <div
          className="h-full rounded-full bg-cobalt transition-[width] duration-500"
          style={{ width: `${(done / list.length) * 100}%` }}
        />
      </div>
      {waiting && <p className="m-0 text-muted">{t("waitingText")}</p>}
      {onlyBilling && <p className="m-0 text-muted">{t("onlyBillingText")}</p>}
      <ol className="m-0 flex list-none flex-col p-0">
        {list.map((s) => {
          const current = s === next;
          return (
            <li key={s.title} className="flex items-start gap-3.5 border-t border-line py-3.5 first:border-t-0">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  s.done ? "bg-cobalt text-white" : current ? "border-2 border-cobalt text-cobalt" : "border border-line-3 text-faint"
                }`}
              >
                {s.done ? "✓" : ""}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={`font-semibold ${s.done ? "text-muted line-through decoration-1" : ""}`}>
                  {s.title}
                  <span className="sr-only">{s.done ? t("srDone") : current ? t("srNext") : ""}</span>
                </span>
                {!s.done && <span className="text-sm text-muted">{s.text}</span>}
                {current && (
                  <Link href={s.href} className="btn btn-sm mt-1.5 self-start">
                    {s.action}
                  </Link>
                )}
              </div>
              {!s.done && !current && (
                <Link href={s.href} className="text-sm font-semibold">
                  {t("open")}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
