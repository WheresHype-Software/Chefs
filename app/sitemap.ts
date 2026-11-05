import type { MetadataRoute } from "next";
import { CITIES } from "@/lib/cities";
import { publicEnv } from "@/lib/env";
import { getChefs } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const chefs = await getChefs();
  // Only city pages with chefs: empty ones are noindex.
  const cities = await Promise.all(CITIES.map(async (c) => ((await getChefs(c.lat, c.lng)).length ? c : null)));
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/procurar`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/para-chefs`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/apoio`, changeFrequency: "monthly", priority: 0.5 },
    ...cities.filter((c) => c !== null).map((c) => ({ url: `${base}/chefs/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...chefs.map((c) => ({ url: `${base}/chef/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
