import type { ReactNode } from "react";
import { ICONS, type IconName } from "@/components/chef/icons";

type Props = { id: string; icon: IconName; title: string; subtitle?: ReactNode; children: ReactNode };

/** One part of the chef page as its own card: an icon, a title, what it's for, then the content. */
export function ChefSection({ id, icon, title, subtitle, children }: Props) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-32 flex-col gap-5 rounded-[14px] border border-line bg-white p-5 md:p-7"
    >
      <header className="flex items-start gap-3.5">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cobalt-soft text-cobalt">
          {ICONS[icon]}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={`${id}-title`} className="m-0 text-[22px] font-bold leading-tight tracking-[-0.01em] text-ink md:text-[24px]">
            {title}
          </h2>
          {subtitle && <p className="m-0 text-[15px] text-muted">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}
