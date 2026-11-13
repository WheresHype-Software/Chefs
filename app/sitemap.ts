import type { MetadataRoute } from "next";
import { CITIES } from "@/lib/cities";
import { publicEnv } from "@/lib/env";
import { getChefs } from "@/lib/data";
import { DEFAULT_LOCALE, LOCALE_TAG, LOCALES, localizePath } from "@/lib/i18n/routing";

type Entry = { path: string; changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>; priority: number };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const chefs = await getChefs();
  // Only city pages with chefs: empty ones are noindex.
  const cities = await Promise.all(CITIES.map(async (c) => ((await getChefs(c.lat, c.lng)).length ? c : null)));
  const pages: Entry[] = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/procurar", changeFrequency: "daily", priority: 0.9 },
    { path: "/para-chefs", changeFrequency: "monthly", priority: 0.8 },
    { path: "/apoio", changeFrequency: "monthly", priority: 0.5 },
    ...cities.filter((c) => c !== null).map((c) => ({ path: `/chefs/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...chefs.map((c) => ({ path: `/chef/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
  // Every page in every language, each listing all its language versions (hreflang in the sitemap).
  return pages.flatMap(({ path, changeFrequency, priority }) => {
    const languages = Object.fromEntries(LOCALES.map((l) => [LOCALE_TAG[l], `${base}${localizePath(path, l)}`]));
    return LOCALES.map((l) => ({
      url: `${base}${localizePath(path, l)}`,
      changeFrequency,
      priority: l === DEFAULT_LOCALE ? priority : Math.round(priority * 0.9 * 10) / 10,
      alternates: { languages },
    }));
  });
}
