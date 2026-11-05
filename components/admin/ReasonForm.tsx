"use client";

import { useState, type ReactNode } from "react";
import { FormMessage, type FormMessageValue } from "@/components/ui/FormMessage";

type Props = {
  label: string;
  placeholder?: string;
  submitLabel: string;
  danger?: boolean;
  busy?: boolean;
  message?: FormMessageValue | null;
  extra?: ReactNode;
  onSubmit: (reason: string) => void;
};

/**
 * Nothing that moves money happens without a reason written down. Rather than repeat the same
 * input-and-button in every panel, every such action opens one of these — which also makes the
 * rule visible: if there is no box to type in, the action does not change money.
 */
export function ReasonForm({ label, placeholder, submitLabel, danger, busy, message, extra, onSubmit }: Props) {
  const [reason, setReason] = useState("");

  return (
    <form
      className="flex flex-col gap-2.5 border-t border-line pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(reason.trim());
      }}
    >
      {extra}
      <label className="field lab">
        <span>{label}</span>
        <input
          required
          minLength={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className={`btn btn-sm ${danger ? "btn-o !border-line-2 !text-danger" : ""}`} disabled={busy || reason.trim().length < 3}>
          {busy ? "A processar…" : submitLabel}
        </button>
        <FormMessage message={message ?? null} />
      </div>
    </form>
  );
}
