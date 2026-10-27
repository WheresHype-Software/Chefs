import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { getChefs } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const chefs = await getChefs();
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/para-chefs`, changeFrequency: "monthly", priority: 0.8 },
    ...chefs.map((c) => ({ url: `${base}/chef/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
