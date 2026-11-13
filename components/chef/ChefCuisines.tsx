import { useLocale, useTranslations } from "next-intl";
import { ChefSection } from "@/components/chef/ChefSection";
import { cuisineLabel } from "@/lib/constants";
import { serviceLabel } from "@/lib/format";
import type { Locale } from "@/lib/i18n/routing";
import type { ChefProfile } from "@/lib/types";

function Group({ title, items, strong }: { title: string; items: string[]; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 text-[14px] font-semibold text-muted">{title}</h3>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={title}>
        {items.map((item) => (
          <li
            key={item}
            className={`rounded-full px-3.5 py-1.5 text-[15px] ${strong ? "bg-cobalt-soft font-semibold text-cobalt-deep" : "border border-line-2 text-ink-3"}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What the chef cooks and how they serve it, each as its own group of tags (room for as many as they have). */
export function ChefCuisines({ chef }: { chef: ChefProfile }) {
  const t = useTranslations("chef.cuisines");
  const tc = useTranslations("search.cuisines");
  const locale = useLocale() as Locale;
  if (!chef.categories.length && !chef.services.length) return null;
  return (
    <ChefSection id="cozinha" icon="menu" title={t("title")} subtitle={t("subtitle")}>
      {chef.categories.length > 0 && (
        <Group title={t("kinds")} items={chef.categories.map((c) => cuisineLabel((k) => tc(k), c))} strong />
      )}
      {chef.services.length > 0 && (
        <div className="border-t border-line pt-4">
          <Group title={t("services")} items={chef.services.map((s) => serviceLabel(s, locale))} />
        </div>
      )}
    </ChefSection>
  );
}
