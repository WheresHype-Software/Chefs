"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("dashboard.billing.form");
  const [form, setForm] = useState<Form>(() => initial(billing));
  const { run, pending, message } = useServerAction(saveBilling, { successMessage: t("saved") });
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
        <h2 className="d m-0 text-2xl font-normal">{t("title")}</h2>
        <p className="m-0 text-sm text-muted">{t("intro")}</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        <Field label={t("entityType")} required>
          <select value={form.entity_type} onChange={(e) => set("entity_type", e.target.value as Form["entity_type"])}>
            <option value="individual">{t("individual")}</option>
            <option value="company">{t("company")}</option>
          </select>
        </Field>
        <Field label={isCompany ? t("companyName") : t("fullName")} required>
          <input required maxLength={160} value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
        </Field>
        <Field label={t("nif")} required hint={t("nifHint")}>
          <input required inputMode="numeric" maxLength={14} value={form.nif} onChange={(e) => set("nif", e.target.value)} />
        </Field>
        <Field label={t("vat")} required hint={t("vatHint")}>
          <select value={form.vat_regime} onChange={(e) => set("vat_regime", e.target.value as Form["vat_regime"])}>
            <option value="isento_art53">{t("vatExempt")}</option>
            <option value="normal">{t("vatNormal")}</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        <Field label={t("address")} required className="sm:col-span-2">
          <input required maxLength={200} value={form.address_line} onChange={(e) => set("address_line", e.target.value)} />
        </Field>
        <Field label={t("postalCode")} required>
          <input
            required
            maxLength={8}
            placeholder="1100-443"
            value={form.postal_code}
            onChange={(e) => set("postal_code", e.target.value)}
          />
        </Field>
        <Field label={t("city")} required>
          <input required maxLength={80} value={form.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
      </div>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="lab mb-1 p-0 text-muted">{isCompany ? t("legendCompany") : t("legendBirth")}</legend>
        <p className="m-0 max-w-[62ch] text-sm text-muted">{t("dac7Text")}</p>
        {isCompany ? (
          <Field label={t("regNumber")} required>
            <input required maxLength={40} value={form.company_reg_number} onChange={(e) => set("company_reg_number", e.target.value)} />
          </Field>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
            <Field label={t("birthDate")} required>
              <input required type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
            </Field>
            <Field label={t("birthPlace")} required>
              <input required maxLength={120} value={form.birth_place} onChange={(e) => set("birth_place", e.target.value)} />
            </Field>
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </button>
        <FormMessage message={message} />
      </div>
    </form>
  );
}
