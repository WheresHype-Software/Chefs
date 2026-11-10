import Link from "next/link";
import { redirect } from "next/navigation";
import { LumiCoach, LumiRail, LumiRestore, LumiSlot } from "@/components/dashboard/LumiCoach";
import { OnboardingSubmit } from "@/components/dashboard/OnboardingSubmit";
import { PhotoManager } from "@/components/dashboard/PhotoManager";
import { ProfileDetails } from "@/components/dashboard/ProfileForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMyChef, getMyPhotos, getSession } from "@/lib/dashboard";
import { initials } from "@/lib/format";
import { onboardingTips } from "@/lib/onboarding-tips";
import { requiredDepositPercent } from "@/lib/money";
import { getSettings, moneyRules } from "@/lib/settings";

const STEPS = ["Criar perfil", "Verificação", "Enviar para revisão"] as const;
const href = (step: number) => `/dashboard/comecar?passo=${step}`;

/**
 * From a new account to a profile sent for review, in one place and in order.
 *
 * Chefs created the account and stopped: the next screen was a long form, and what the review
 * actually needs (photos, a selfie) lived on another page, with the send button back on the first.
 * Here every step leads to the next, and the dashboard sends a draft profile back here until it is
 * sent. Offers and open days come after, from the first-steps list on the overview.
 */
export default async function Comecar({ searchParams }: PageProps<"/dashboard/comecar">) {
  const session = await getSession();
  const chef = await getMyChef();
  if (chef && chef.status !== "draft" && chef.status !== "rejected") redirect("/dashboard");

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

  const reviewItems = [
    { label: "Instagram ou site", done: social, href: href(1) },
    { label: "Fotografia de perfil", done: count("portrait") > 0, href: href(2) },
    { label: "Selfie de verificação", done: count("selfie") > 0, href: href(2) },
    { label: `Fotos de pratos (${Math.min(count("gallery"), 3)}/3)`, done: count("gallery") >= 3, href: href(2) },
  ];
  const lumi = onboardingTips({
    step,
    rejected: chef?.status === "rejected",
    hasProfile: Boolean(chef),
    social,
    portrait: count("portrait") > 0,
    selfie: count("selfie") > 0,
    dishes: count("gallery"),
    ready: reviewItems.every((i) => i.done),
  });

  const settings = await getSettings();
  const minDeposit = settings.paymentsEnabled ? requiredDepositPercent(moneyRules(settings)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={chef?.status === "rejected" ? "Reveja o seu perfil" : "Crie o seu perfil de chef"}
        description="Três passos, uns dez minutos. Pode parar quando quiser: o que guardar fica guardado e volta aqui quando entrar."
      />

      <nav aria-label="Passos">
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
                    ? "Fotografias prontas."
                    : `Falta: ${[
                        count("portrait") === 0 && "fotografia de perfil",
                        count("selfie") === 0 && "selfie de verificação",
                        count("gallery") < 3 &&
                          `${3 - count("gallery")} ${3 - count("gallery") === 1 ? "foto de prato" : "fotos de pratos"}`,
                      ]
                        .filter(Boolean)
                        .join(", ")}.`}
                </span>
                {photosDone ? (
                  <Link href={href(3)} className="btn no-underline">
                    Continuar
                  </Link>
                ) : (
                  <span className="btn opacity-50" aria-disabled="true">
                    Continuar
                  </span>
                )}
              </div>
            </>
          )}

          {step === 3 && chef && (
            <>
              <LumiSlot name="enviar" />
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
