"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { setLumi } from "@/app/dashboard/actions/lumi";
import { Lumi } from "@/components/Lumi";
import { FormMessage } from "@/components/ui/FormMessage";
import { Switch } from "@/components/ui/Switch";
import { useServerAction } from "@/hooks/useServerAction";

/** Where a chef who closed Lumi can bring her back (or turn her off without waiting for her). */
export function LumiSetting({ on: initial }: { on: boolean }) {
  const t = useTranslations("dashboard.lumi");
  const [on, setOn] = useState(initial);
  const save = useServerAction(setLumi, { successMessage: undefined });
  return (
    <section aria-labelledby="ajuda-lumi" className="box flex items-center gap-4 p-5">
      <Lumi mood={on ? "ola" : "espera"} size={56} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id="ajuda-lumi" className="m-0 text-base font-bold">
          {t("settingTitle")}
        </h2>
        <span className="text-sm text-muted">{t("settingText")}</span>
        <FormMessage message={save.message} />
      </div>
      <Switch
        checked={on}
        label={t("show")}
        onChange={(next) => {
          setOn(next);
          save.run(next);
        }}
      />
    </section>
  );
}
