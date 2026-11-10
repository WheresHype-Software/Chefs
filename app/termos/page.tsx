import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { TERMS_INTRO, TERMS_SECTIONS, TERMS_TITLE, TERMS_UPDATED } from "@/lib/terms";

export const metadata: Metadata = {
  title: TERMS_TITLE,
  description: "Termos e condições de utilização do Ao Lume, para clientes e para chefs.",
  alternates: { canonical: "/termos" },
};

export default function Termos() {
  return <LegalPage title={TERMS_TITLE} updated={TERMS_UPDATED} intro={TERMS_INTRO} sections={TERMS_SECTIONS} />;
}
