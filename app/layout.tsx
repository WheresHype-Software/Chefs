import type { Metadata } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import { publicEnv } from "@/lib/env";
import "./globals.css";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
    <html lang="pt-PT" className={`${bodoni.variable} ${hanken.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
