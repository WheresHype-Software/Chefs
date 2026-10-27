"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormMessageValue } from "@/components/ui/FormMessage";
import type { ActionResult } from "@/lib/result";

type Options = {
  /** Message shown after success; omit to show nothing. */
  successMessage?: string;
  /** Re-render server components after success (default true). */
  refresh?: boolean;
  onSuccess?: () => void;
};

/**
 * Runs a server action inside a transition and tracks its pending state and outcome message,
 * so forms don't each re-implement the same try/message/refresh dance.
 */
export function useServerAction<Args extends unknown[]>(action: (...args: Args) => Promise<ActionResult>, options: Options = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<FormMessageValue | null>(null);

  function run(...args: Args) {
    setMessage(null);
    startTransition(async () => {
      const result = await action(...args);
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      if (options.successMessage) setMessage({ ok: true, text: options.successMessage });
      if (options.refresh ?? true) router.refresh();
      options.onSuccess?.();
    });
  }

  return { run, pending, message, setMessage };
}
