export type StatusStep = { label: string; /** When it happened, or what happens there. */ detail: string };

type Props = {
  steps: StatusStep[];
  /** Index of the current step; steps before it are done. */
  current: number;
  /** Shown under the current step when the client has something to do (e.g. answer a proposal). */
  action?: string;
};

/**
 * Booking progress. A vertical timeline on phones (readable labels, room for times), a row of four
 * on wider screens. The current step is marked for screen readers with aria-current.
 */
export function StatusSteps({ steps, current, action }: Props) {
  return (
    <ol aria-label="Estado do pedido" className="m-0 grid list-none p-0 md:grid-cols-4 md:gap-3">
      {steps.map((s, i) => {
        const done = i < current;
        const now = i === current;
        const last = i === steps.length - 1;
        return (
          <li
            key={s.label}
            aria-current={now ? "step" : undefined}
            className="relative flex gap-3.5 pb-5 last:pb-0 md:flex-col md:gap-2.5 md:pb-0"
          >
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute left-[11px] top-7 bottom-1 w-0.5 rounded md:bottom-auto md:left-9 md:right-1 md:top-[11px] md:h-0.5 md:w-auto ${
                  done ? "bg-cobalt" : "bg-line-2"
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                done ? "bg-cobalt text-white" : now ? "border-2 border-cobalt bg-white" : "border border-line-3 bg-white"
              }`}
            >
              {done ? "✓" : now ? <span className="h-2 w-2 rounded-full bg-cobalt" /> : null}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 pt-0.5 md:pt-0">
              <span className={`text-[15px] font-semibold ${now ? "text-cobalt" : done ? "text-ink" : "text-muted"}`}>
                {s.label}
                <span className="sr-only">{done ? " (feito)" : now ? " (agora)" : ""}</span>
              </span>
              <span className="text-[13px] text-muted">{s.detail}</span>
              {now && action && (
                <span className="mt-1.5 self-start rounded-full bg-yolk-soft px-2.5 py-1 text-[13px] font-semibold text-ink">{action}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
