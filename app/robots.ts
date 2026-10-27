import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = publicEnv.siteUrl;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/reserva", "/entrar"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
