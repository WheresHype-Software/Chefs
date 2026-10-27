import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Termos" };

// [Placeholder] Final terms must be written with a Portuguese lawyer (see the project spec, open questions).
export default function Termos() {
  return (
    <LegalPage title="Termos de utilização">
      <p className="m-0">
        O Ao Lume é um intermediário: liga clientes a chefs independentes. Não presta serviços de restauração, não recebe pagamentos e não
        garante a segurança alimentar.
      </p>
      <p className="m-0">
        Cada chef é responsável pelo seu serviço, preços, pagamentos, política de cancelamento e pelo cumprimento das regras aplicáveis à
        sua atividade, incluindo higiene e segurança alimentar (HACCP), licenciamento e obrigações fiscais.
      </p>
      <p className="m-0">[Texto completo dos termos para clientes e para chefs]</p>
    </LegalPage>
  );
}
