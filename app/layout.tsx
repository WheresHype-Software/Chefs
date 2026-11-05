import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { publicEnv } from "@/lib/env";
import "./globals.css";
import { CookieBanner } from "@/components/analytics/CookieBanner";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteJsonLd } from "@/lib/seo";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "Ao Lume · chefs privados e comida caseira perto de si",
    template: "%s · Ao Lume",
  },
  description:
    "Encontre chefs privados e cozinheiros caseiros perto de si: jantares em casa, marmitas da semana, pastelaria, entregas e eventos. Peça sem criar conta e pague só depois de o chef aceitar.",
  openGraph: { siteName: "Ao Lume", locale: "pt_PT", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className={`${schibsted.variable} antialiased`}>
      <body>
        {children}
        <JsonLd data={siteJsonLd()} />
        {publicEnv.metaPixelId && (
          <>
            <MetaPixel id={publicEnv.metaPixelId} />
            <CookieBanner />
          </>
        )}
      </body>
    </html>
  );
}
