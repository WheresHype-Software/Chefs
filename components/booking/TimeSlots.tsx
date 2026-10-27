import { Chip } from "@/components/ui/Chip";

type Props = { slots: string[]; selected: string | null; onSelect: (slot: string) => void };

const DEFAULT_SLOTS = ["13:00", "20:00"];

export function TimeSlots({ slots, selected, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="lab m-0 border-b border-ink pb-2.5">Hora</h3>
      <div className="flex flex-wrap gap-1.5">
        {(slots.length ? slots : DEFAULT_SLOTS).map((t) => (
          <Chip key={t} pressed={selected === t} onClick={() => onSelect(t)}>
            {t}
          </Chip>
        ))}
      </div>
    </div>
  );
}
