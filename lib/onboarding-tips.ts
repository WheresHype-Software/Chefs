import type { LumiTip } from "@/components/dashboard/LumiCoach";
import type { Locale } from "@/lib/i18n/routing";
import { getTranslator } from "@/lib/i18n/translator";

type State = {
  step: number;
  rejected: boolean;
  hasProfile: boolean;
  social: boolean;
  portrait: boolean;
  selfie: boolean;
  dishes: number;
  ready: boolean;
};

/**
 * What Lumi says beside each part of the onboarding form, in the same formal register as the
 * rest of the dashboard, and where she starts: the first thing still to do. Mostly why each thing
 * is asked: a selfie and a link to someone's Instagram, asked without a reason, read like a hurdle.
 * Each `target` is a `data-lumi` name on the form; the words live in messages/<locale>/dashboard.json
 * under `tips.onboarding`.
 */
export function onboardingTips(s: State, locale: Locale): { tips: LumiTip[]; start: string } {
  const t = getTranslator(locale, "dashboard.tips.onboarding");

  if (s.step === 1) {
    const tips: LumiTip[] = [
      s.rejected
        ? { target: "nome", mood: "ups", title: t("rejected.title"), text: t("rejected.text") }
        : s.hasProfile
          ? { target: "nome", mood: "dica", title: t("resume.title"), text: t("resume.text") }
          : { target: "nome", mood: "ola", title: t("welcome.title"), text: t("welcome.text") },
      { target: "link", mood: "dica", title: t("link.title"), text: t("link.text") },
      { target: "aparecer", mood: "dica", title: t("appear.title"), text: t("appear.text") },
      { target: "perfil", mood: "dica", title: t("profile.title"), text: t("profile.text") },
      { target: "frase", mood: "dica", title: t("headline.title"), text: t("headline.text") },
      { target: "bio", mood: "dica", title: t("bio.title"), text: t("bio.text") },
      { target: "zona", mood: "dica", title: t("area.title"), text: t("area.text") },
      { target: "raio", mood: "dica", title: t("radius.title"), text: t("radius.text") },
      { target: "social", mood: "dica", title: t("social.title"), text: t("social.text") },
    ];
    return { tips, start: s.hasProfile && !s.social && !s.rejected ? "social" : "nome" };
  }

  if (s.step === 2) {
    const missing = Math.max(0, 3 - s.dishes);
    const tips: LumiTip[] = [
      {
        target: "retrato",
        mood: s.portrait ? "festa" : "dica",
        title: t("portrait.title"),
        text: s.portrait ? t("portrait.done") : t("portrait.todo"),
      },
      {
        target: "selfie",
        mood: s.selfie ? "festa" : "dica",
        title: t("selfie.title"),
        text: s.selfie ? t("selfie.done") : t("selfie.todo"),
      },
      {
        target: "pratos",
        mood: missing ? "dica" : "festa",
        title: t("dishes.title"),
        text: !missing ? t("dishes.enough") : missing === 3 ? t("dishes.needThree") : t("dishes.missing", { count: missing }),
      },
      { target: "continuar", mood: "festa", title: t("continue.title"), text: t("continue.text") },
    ];
    const start = !s.portrait ? "retrato" : !s.selfie ? "selfie" : missing ? "pratos" : "continuar";
    return { tips, start };
  }

  return {
    start: "enviar",
    tips: [
      s.ready
        ? { target: "enviar", mood: "festa", title: t("ready.title"), text: t("ready.text") }
        : { target: "enviar", mood: "ups", title: t("notReady.title"), text: t("notReady.text") },
    ],
  };
}
