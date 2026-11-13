// schema.org data for search engines: who we are, where a page sits, and each chef as a local
// business with its zone, menus, rating and reviews (so results can show stars and prices).
import type { Metadata } from "next";
import type { Crumb } from "@/components/seo/Breadcrumbs";
import { DEFAULT_LOCALE, LOCALE_TAG, LOCALES, localizePath, type Locale } from "./i18n/routing";
import { nearestCity } from "./cities";
import { siteUrl } from "./env";
import { fromPrice, titledName } from "./format";
import type { ChefCard, ChefProfile } from "./types";

const SITE_NAME = "Ao Lume";

/**
 * Canonical URL and hreflang alternates for a page that exists in every language:
 * alternates("/para-chefs", "en") → canonical /en/para-chefs, pt-PT → /para-chefs, en-GB → /en/para-chefs.
 */
export function alternates(path: string, locale: Locale): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = Object.fromEntries(LOCALES.map((l) => [LOCALE_TAG[l], siteUrl(localizePath(path, l))]));
  languages["x-default"] = siteUrl(localizePath(path, DEFAULT_LOCALE));
  return { canonical: siteUrl(localizePath(path, locale)), languages };
}

export function siteJsonLd(locale: Locale = DEFAULT_LOCALE) {
  return [
    { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: siteUrl("/"), logo: siteUrl("/email/logo.png") },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: siteUrl(localizePath("/", locale)),
      inLanguage: LOCALE_TAG[locale],
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: siteUrl(`${localizePath("/procurar", locale)}?onde={search_term_string}`) },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

export function breadcrumbJsonLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: siteUrl(c.href) })),
  };
}

/** Ao Lume › Chefs em <nearest city> (or Portugal) › Chef <name>. */
export function chefBreadcrumbs(chef: ChefCard): Crumb[] {
  const city = nearestCity(chef);
  return [
    { name: SITE_NAME, href: "/" },
    city ? { name: `Chefs em ${city.name}`, href: `/chefs/${city.slug}` } : { name: "Chefs em Portugal", href: "/procurar" },
    { name: titledName(chef), href: `/chef/${chef.slug}` },
  ];
}

export function chefJsonLd(chef: ChefProfile) {
  const url = siteUrl(`/chef/${chef.slug}`);
  const price = fromPrice(chef.offers);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": url,
    name: titledName(chef),
    url,
    description: chef.bio ?? chef.headline ?? undefined,
    image: [chef.portrait, chef.cover, ...chef.gallery.map((g) => g.url)].filter(Boolean).slice(0, 6),
    address: { "@type": "PostalAddress", addressLocality: chef.area ?? undefined, addressCountry: "PT" },
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: { "@type": "GeoCoordinates", latitude: chef.lat, longitude: chef.lng },
      geoRadius: Number(chef.radiusKm) * 1000,
    },
    priceRange: price === "orçamento" ? "Sob orçamento" : `Desde ${price}`,
    knowsLanguage: chef.languages.length ? chef.languages : ["pt"],
    makesOffer: chef.offers.map((o) => ({
      "@type": "Offer",
      name: o.title,
      description: o.description ?? undefined,
      ...(o.price != null && o.priceModel !== "quote" ? { price: Number(o.price), priceCurrency: "EUR" } : {}),
      itemOffered: { "@type": "Service", name: o.title },
    })),
    ...(chef.reviewCount > 0 && chef.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(chef.rating).toFixed(1),
            reviewCount: chef.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
          review: chef.reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.author },
            datePublished: r.date.slice(0, 10),
            reviewRating: { "@type": "Rating", ratingValue: Math.round(r.overall), bestRating: 5, worstRating: 1 },
            reviewBody: r.comment ?? undefined,
          })),
        }
      : {}),
  };
}

/** A city page's chefs, in order, for search engines. */
export function chefListJsonLd(chefs: ChefCard[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: chefs.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: siteUrl(`/chef/${c.slug}`), name: titledName(c) })),
  };
}
