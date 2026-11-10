"use client";

import { setChefBadges } from "@/app/admin/actions";
import { Chip } from "@/components/ui/Chip";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";
import { useToggleList } from "@/hooks/useToggleList";
import { BADGE_LABEL, BADGES, type Badge } from "@/lib/constants";

/** The badges that are not the title: shown as chips next to the title switch. */
const EXTRAS: Badge[] = BADGES.filter((b) => b !== "certified");

/**
 * Title and badges of a chef already on the roster: switch between Cozinheiro/a and Chef, and
 * give or take Fundador and the verification badges. Saves only when something changed.
 */
export function ChefBadgesEditor({ chefId, badges, cook }: { chefId: string; badges: string[]; cook: "Cozinheiro" | "Cozinheira" }) {
  const initial = badges.filter((b): b is Badge => (BADGES as readonly string[]).includes(b));
  const list = useToggleList<Badge>(initial);
  const { run, pending, message } = useServerAction(setChefBadges, { successMessage: "Selos guardados." });
  const chef = list.has("certified");
  const changed = list.items.length !== initial.length || list.items.some((b) => !initial.includes(b));
  const setTitle = (toChef: boolean) => {
    if (toChef !== chef) list.toggle("certified");
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="lab">Título</span>
        <div role="group" aria-label="Título" className="flex rounded-[3px] border border-line-2 p-0.5">
          {[
            [false, cook],
            [true, "Chef"],
          ].map(([value, label]) => (
            <button
              key={String(value)}
              type="button"
              aria-pressed={chef === value}
              onClick={() => setTitle(value as boolean)}
              className={`min-h-9 cursor-pointer rounded-[2px] border-0 px-3 font-[inherit] text-[13px] font-semibold ${
                chef === value ? "bg-cobalt text-white" : "bg-transparent text-ink hover:bg-paper"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Selos">
        <span className="lab">Selos</span>
        {EXTRAS.map((b) => (
          <Chip key={b} pressed={list.has(b)} onClick={() => list.toggle(b)} className="!min-h-9 text-[13px]">
            {BADGE_LABEL[b]}
          </Chip>
        ))}
        {changed && (
          <button type="button" className="btn btn-sm ml-auto" disabled={pending} onClick={() => run(chefId, list.items)}>
            {pending ? "A guardar…" : "Guardar selos"}
          </button>
        )}
      </div>
      <FormMessage message={message} />
    </div>
  );
}
