"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { confirmIbanChange } from "@/app/dashboard/actions/billing";
import { callAction } from "@/lib/call-action";

/**
 * Confirms the change as soon as the page opens — the chef already decided when they clicked the
 * link in their email; asking twice only makes people hesitate over something they asked for.
 */
export function IbanConfirmation({ token }: { token: string }) {
  const t = useTranslations("dashboard.confirmIban");
  const [state, setState] = useState<{ status: "working" | "done" | "failed"; error?: string }>({ status: "working" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // Strict Mode mounts twice in development; the token is single use.
    ran.current = true;
    void (async () => {
      const result = await callAction(() => confirmIbanChange(token));
      setState(result.ok ? { status: "done" } : { status: "failed", error: result.error });
    })();
  }, [token]);

  if (state.status === "working") return <p className="m-0 text-muted">{t("confirming")}</p>;
  if (state.status === "failed")
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="m-0 text-danger">
          {state.error}
        </p>
        <Link href="/dashboard/faturacao" className="btn btn-o btn-sm self-start">
          {t("backToBilling")}
        </Link>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0">{t("done")}</p>
      <Link href="/dashboard/faturacao" className="btn btn-sm self-start">
        {t("seeBilling")}
      </Link>
    </div>
  );
}
