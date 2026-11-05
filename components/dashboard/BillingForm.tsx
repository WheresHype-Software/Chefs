"use client";

import { useState } from "react";
import { saveBilling } from "@/app/dashboard/actions/billing";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import type { ChefBilling } from "@/lib/dashboard";

type Form = {
  entity_type: "individual" | "company";
  legal_name: string;
  nif: string;
  vat_regime: "normal" | "isento_art53";
  address_line: string;
  postal_code: string;
  city: string;
  country: string;
  birth_date: string;
  birth_place: string;
  company_reg_number: string;
};

function initial(b: ChefBilling | null): Form {
  return {
    entity_type: b?.entity_type ?? "individual",
    legal_name: b?.legal_name ?? "",
    nif: b?.nif ?? "",
    vat_regime: b?.vat_regime ?? "isento_art53",
    address_line: b?.address_line ?? "",
    postal_code: b?.postal_code ?? "",
    city: b?.city ?? "",
    country: b?.country ?? "PT",
    birth_date: b?.birth_date ?? "",
    birth_place: b?.birth_place ?? "",
    company_reg_number: b?.company_reg_number ?? "",
  };
}

/**
 * The chef's fiscal identity: what every payment document will say about them. Asked once,
 * changed rarely, and the reason for each unusual field is written next to it — people type real
 * data when they understand why it is wanted.
 */
export function BillingForm({ billing }: { billing: ChefBilling | null }) {
  const [form, setForm] = useState<Form>(() => initial(billing));
  const { run, pending, message } = useServerAction(saveBilling, { successMessage: "Dados guardados." });
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const isCompany = form.entity_type === "company";

  return (
    <form
      className="box flex min-w-0 flex-col gap-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(form);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="d m-0 text-2xl font-normal">Os teus dados fiscais</h2>
        <p className="m-0 text-sm text-muted">
          São estes dados que aparecem no documento que recebes com cada pagamento. Só tu e a nossa equipa os veem.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        <Field label="Trabalhas como" required>
          <select value={form.entity_type} onChange={(e) => set("entity_type", e.target.value as Form["entity_type"])}>
            <option value="individual">Nome individual</option>
            <option value="company">Empresa / sociedade</option>
          </select>
        </Field>
        <Field label={isCompany ? "Denominação social" : "Nome completo"} required>
          <input required maxLength={160} value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
        </Field>
        <Field label="NIF" required hint="Nove dígitos. Confirmamos o dígito de controlo.">
          <input required inputMode="numeric" maxLength={14} value={form.nif} onChange={(e) => set("nif", e.target.value)} />
        </Field>
        <Field label="Regime de IVA" required hint="Na dúvida, é o que o teu contabilista indicou ao abrir atividade.">
          <select value={form.vat_regime} onChange={(e) => set("vat_regime", e.target.value as Form["vat_regime"])}>
            <option value="isento_art53">Isento (artigo 53.º)</option>
            <option value="normal">Regime normal</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        <Field label="Morada fiscal" required className="sm:col-span-2">
          <input required maxLength={200} value={form.address_line} onChange={(e) => set("address_line", e.target.value)} />
        </Field>
        <Field label="Código postal" required>
          <input
            required
            maxLength={8}
            placeholder="1100-443"
            value={form.postal_code}
            onChange={(e) => set("postal_code", e.target.value)}
          />
        </Field>
        <Field label="Localidade" required>
          <input required maxLength={80} value={form.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
      </div>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="lab mb-1 p-0 text-muted">{isCompany ? "Registo comercial" : "Nascimento"} · exigido por lei (DAC7)</legend>
        <p className="m-0 max-w-[62ch] text-sm text-muted">
          Desde que passámos a intermediar pagamentos, somos obrigados a comunicar estes dados à Autoridade Tributária uma vez por ano, com
          os valores que recebeste. Dizemos-te sempre o que foi comunicado.
        </p>
        {isCompany ? (
          <Field label="Número de registo comercial" required>
            <input required maxLength={40} value={form.company_reg_number} onChange={(e) => set("company_reg_number", e.target.value)} />
          </Field>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
            <Field label="Data de nascimento" required>
              <input required type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
            </Field>
            <Field label="Local de nascimento" required>
              <input required maxLength={120} value={form.birth_place} onChange={(e) => set("birth_place", e.target.value)} />
            </Field>
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn" disabled={pending}>
          {pending ? "A guardar…" : "Guardar dados fiscais"}
        </button>
        <FormMessage message={message} />
      </div>
    </form>
  );
}
