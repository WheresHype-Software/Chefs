import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { redirectLocalized } from "@/lib/i18n/server";
import { LegalAcceptanceCard } from "@/components/dashboard/LegalAcceptanceCard";
import { LumiCoach, LumiRail, LumiRestore, LumiSlot } from "@/components/dashboard/LumiCoach";
import { OnboardingSubmit } from "@/components/dashboard/OnboardingSubmit";
import { PhotoManager } from "@/components/dashboard/PhotoManager";
import { ProfileDetails } from "@/components/dashboard/ProfileForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMyChef, getMyPhotos, getSession } from "@/lib/dashboard";
import { myAcceptance } from "@/lib/acceptance";
import { initials } from "@/lib/format";
import { onboardingTips } from "@/lib/onboarding-tips";
import { requiredDepositPercent } from "@/lib/money";
import { getSettings, moneyRules } from "@/lib/settings";

const href = (step: number) => `/dashboard/comecar?passo=${step}`;

/**
 * From a new account to a profile sent for review, in one place and in order.
 *
 * Chefs created the account and stopped: the next screen was a long form, and what the review
 * actually needs (photos, a selfie) lived on another page, with the send button back on the first.
 * Here every step leads to the next, and the dashboard sends a draft profile back here until it is
 * sent. Offers and open days come after, from the first-steps list on the overview.
 */
export default async function Comecar({ searchParams }: PageProps<"/[locale]/dashboard/comecar">) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard.onboarding");
  const STEPS = [t("steps.profile"), t("steps.verification"), t("steps.review")] as const;
  const session = await getSession();
  const chef = await getMyChef();
  if (chef && chef.status !== "draft" && chef.status !== "rejected") return redirectLocalized("/dashboard");

  const photos = chef ? await getMyPhotos() : [];
  const count = (kind: string) => photos.filter((p) => p.kind === kind).length;
  const social = Boolean(chef?.socials.instagram || chef?.socials.website);
  const profileDone = Boolean(chef) && social;
  const photosDone = count("portrait") > 0 && count("selfie") > 0 && count("gallery") >= 3;
  const done = [profileDone, photosDone, false];

  // Straight to the first step not done; later steps only once there is a profile to attach them to.
  const first = !profileDone ? 1 : !photosDone ? 2 : 3;
  const asked = Number((await searchParams).passo);
  const step = asked >= 1 && asked <= 3 && (asked === 1 || chef) ? asked : first;

  // Accounts made before the sign-up checkbox existed, or clients who became chefs, accept here.
  const legal = session.demo || !session.userId ? { terms: true, contract: true } : await myAcceptance(session.userId);
  const toAccept = [...(legal.terms ? [] : ["terms" as const]), ...(legal.contract ? [] : ["chef_contract" as const])];

  const reviewItems = [
    { label: t("items.terms"), done: toAccept.length === 0, href: href(3) },
    { label: t("items.social"), done: social, href: href(1) },
    { label: t("items.portrait"), done: count("portrait") > 0, href: href(2) },
    { label: t("items.selfie"), done: count("selfie") > 0, href: href(2) },
    { label: t("items.dishes", { count: Math.min(count("gallery"), 3) }), done: count("gallery") >= 3, href: href(2) },
  ];
  const lumi = onboardingTips(
    {
      step,
      rejected: chef?.status === "rejected",
      hasProfile: Boolean(chef),
      social,
      portrait: count("portrait") > 0,
      selfie: count("selfie") > 0,
      dishes: count("gallery"),
      ready: reviewItems.every((i) => i.done),
    },
    locale,
  );

  const settings = await getSettings();
  const minDeposit = settings.paymentsEnabled ? requiredDepositPercent(moneyRules(settings)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={chef?.status === "rejected" ? t("titleRejected") : t("title")}
        description={t("description")}
      />

      <nav aria-label={t("stepsLabel")}>
        <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const current = n === step;
            const reachable = n === 1 || Boolean(chef);
            const body = (
              <>
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                    done[i] ? "bg-cobalt text-white" : current ? "border-2 border-cobalt text-cobalt" : "border border-line-3 text-faint"
                  }`}
                >
                  {done[i] ? "✓" : n}
                </span>
                <span className={`text-sm font-semibold ${current ? "text-ink" : "text-muted"}`}>{label}</span>
              </>
            );
            return (
              <li key={label} className={`border-t-[3px] pt-2.5 ${current || done[i] ? "border-cobalt" : "border-line-2"}`}>
                {reachable && !current ? (
                  <Link href={href(n)} className="flex items-center gap-2 no-underline">
                    {body}
                  </Link>
                ) : (
                  <span aria-current={current ? "step" : undefined} className="flex items-center gap-2">
                    {body}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 max-w-[880px] flex-col gap-6">
          {step === 1 && <ProfileDetails chef={chef} minDeposit={minDeposit} next={href(2)} />}

          {step === 2 && chef && (
            <>
              <PhotoManager photos={photos} userId={session.userId} initials={initials(chef.display_name)} approved={false} />
              <LumiSlot name="continuar" />
              <div data-lumi="continuar" className="box flex flex-wrap items-center justify-between gap-4 p-5">
                <span className="text-sm text-muted">
                  {photosDone
                    ? t("photosReady")
                    : t("missing", {
                        items: [
                          count("portrait") === 0 && t("missingPortrait"),
                          count("selfie") === 0 && t("missingSelfie"),
                          count("gallery") < 3 && t("missingDishes", { count: 3 - count("gallery") }),
                        ]
                          .filter(Boolean)
                          .join(", "),
                      })}
                </span>
                {photosDone ? (
                  <Link href={href(3)} className="btn no-underline">
                    {t("continue")}
                  </Link>
                ) : (
                  <span className="btn opacity-50" aria-disabled="true">
                    {t("continue")}
                  </span>
                )}
              </div>
            </>
          )}

          {step === 3 && chef && (
            <>
              <LumiSlot name="enviar" />
              {toAccept.length > 0 && (
                <div className="max-w-[640px]">
                  <LegalAcceptanceCard kinds={toAccept} context="onboarding" intro={t("legalIntro")} />
                </div>
              )}
              <OnboardingSubmit notes={chef.status === "rejected" ? chef.verification_notes : null} items={reviewItems} />
            </>
          )}
        </div>
        <LumiRail />
      </div>

      {session.lumiOff ? (
        <LumiRestore />
      ) : (
        <LumiCoach key={`${step}:${lumi.start}`} tips={lumi.tips} start={lumi.start} followScroll={step === 2} />
      )}
    </div>
  );
}
