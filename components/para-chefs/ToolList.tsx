import { useTranslations } from "next-intl";
import { revealDelay } from "@/lib/motion";

const TOOLS = ["calendar", "chat", "menus", "cancellation", "categories", "travel", "pickup", "reviews"] as const;

function Check() {
  return (
    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cobalt-soft text-cobalt">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <path d="M5 12.5 10 17 19 7" />
      </svg>
    </span>
  );
}

/** What chefs get to run their bookings, as cards. */
export function ToolList() {
  const t = useTranslations("paraChefs.tools.items");
  return (
    <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {TOOLS.map((key, i) => (
        <li key={key} className="al-rv flex gap-3 rounded-[10px] border border-line bg-white p-4" style={revealDelay(i % 4, 5)}>
          <Check />
          <div className="flex min-w-0 flex-col gap-0.5">
            <strong className="text-[16px]">{t(`${key}.title`)}</strong>
            <span className="text-[14px] text-muted">{t(`${key}.text`)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
