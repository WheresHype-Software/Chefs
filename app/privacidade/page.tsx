import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacidade" };

// [Placeholder] Final GDPR policy must be reviewed by a Portuguese lawyer.
export default function Privacidade() {
  return (
    <LegalPage title="Política de privacidade">
      <p className="m-0">
        Guardamos apenas o necessário para a reserva: nome, email, telemóvel e, quando o serviço é em casa ou com entrega, a morada. A
        morada só é visível para o chef da reserva.
      </p>
      <p className="m-0">No mapa, os chefs aparecem numa zona aproximada, nunca na morada exata.</p>
      <p className="m-0">[Responsável pelo tratamento, prazos de conservação, direitos RGPD e contacto]</p>
    </LegalPage>
  );
}
