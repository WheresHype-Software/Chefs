import type { LumiTip } from "@/components/dashboard/LumiCoach";
import type { Locale } from "@/lib/i18n/routing";
import { getTranslator } from "@/lib/i18n/translator";

/**
 * What Lumi says on the dashboard pages, one short tip per part of the page and no more: enough
 * to show how the page works the first time, not a manual. Each `target` is a `data-lumi` name on
 * that page. The onboarding steps have their own, in onboarding-tips.ts. The words live in
 * messages/<locale>/dashboard.json under `tips`.
 */

const tr = (locale: Locale) => getTranslator(locale, "dashboard");

export function agendaTips(openDays: number, locale: Locale): { tips: LumiTip[]; start: string } {
  const t = tr(locale);
  return {
    start: openDays === 0 ? "semana" : "calendario",
    tips: [
      {
        target: "semana",
        mood: openDays === 0 ? "ola" : "dica",
        title: t("tips.agenda.weekly.title"),
        text: t("tips.agenda.weekly.text"),
      },
      {
        target: "calendario",
        mood: "dica",
        title: t("tips.agenda.calendar.title"),
        text: t("tips.agenda.calendar.text"),
      },
    ],
  };
}

export function offerTips(activeOffers: number, locale: Locale): { tips: LumiTip[]; start: string } {
  const t = tr(locale);
  return {
    start: "ofertas",
    tips: [
      activeOffers === 0
        ? { target: "ofertas", mood: "ola", title: t("tips.offers.first.title"), text: t("tips.offers.first.text") }
        : { target: "ofertas", mood: "dica", title: t("tips.offers.list.title"), text: t("tips.offers.list.text") },
      { target: "oferta-titulo", mood: "dica", title: t("tips.offers.title.title"), text: t("tips.offers.title.text") },
      { target: "oferta-onde", mood: "dica", title: t("tips.offers.where.title"), text: t("tips.offers.where.text") },
      { target: "oferta-preco", mood: "dica", title: t("tips.offers.price.title"), text: t("tips.offers.price.text") },
      { target: "oferta-horas", mood: "dica", title: t("tips.offers.hours.title"), text: t("tips.offers.hours.text") },
      {
        target: "oferta-antecedencia",
        mood: "dica",
        title: t("tips.offers.leadTime.title"),
        text: t("tips.offers.leadTime.text"),
      },
    ],
  };
}

export function cookingTips(locale: Locale): LumiTip[] {
  const t = tr(locale);
  return [
    { target: "categorias", mood: "dica", title: t("tips.cooking.categories.title"), text: t("tips.cooking.categories.text") },
    { target: "servicos", mood: "dica", title: t("tips.cooking.services.title"), text: t("tips.cooking.services.text") },
  ];
}

export function photoTips(locale: Locale): LumiTip[] {
  const t = tr(locale);
  return [
    { target: "retrato", mood: "dica", title: t("tips.photos.portrait.title"), text: t("tips.photos.portrait.text") },
    { target: "pratos", mood: "dica", title: t("tips.photos.dishes.title"), text: t("tips.photos.dishes.text") },
  ];
}

/** On Pedidos, beside the first request still waiting for a price. */
export function quoteTip(locale: Locale): LumiTip {
  const t = tr(locale);
  return { target: "orcamento", mood: "dica", title: t("tips.requests.quote.title"), text: t("tips.requests.quote.text") };
}
