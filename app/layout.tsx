import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { publicEnv } from "@/lib/env";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "Ao Lume — chefs privados e comida caseira perto de si",
    template: "%s · Ao Lume",
  },
  description:
    "Encontre chefs privados e cozinheiros caseiros perto de si: jantares em casa, marmitas da semana, pastelaria, entregas e eventos. Sem comissões.",
  openGraph: { siteName: "Ao Lume", locale: "pt_PT", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className={`${schibsted.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
