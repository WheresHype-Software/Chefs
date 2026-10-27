"use client";

import { useId, useState } from "react";
import { Chip } from "@/components/ui/Chip";

export type ToggleItem = { label: string; active: boolean };

type Props = { items: ToggleItem[]; onChange: (items: ToggleItem[]) => void; addLabel: string; addPlaceholder: string };

/** Chips that switch on/off, plus an inline field to add a new one (zones, pickup slots…). */
export function ToggleChipList({ items, onChange, addLabel, addPlaceholder }: Props) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function add() {
    const label = draft.trim();
    if (label && !items.some((i) => i.label.toLowerCase() === label.toLowerCase())) onChange([...items, { label, active: true }]);
    setDraft("");
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Chip
          key={item.label}
          pressed={item.active}
          onClick={() => onChange(items.map((x, j) => (j === i ? { ...x, active: !x.active } : x)))}
        >
          {item.label}
        </Chip>
      ))}
      <form
        className="flex"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          {addLabel}
        </label>
        <input
          id={inputId}
          value={draft}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={addPlaceholder}
          className="chip w-32 cursor-text"
        />
      </form>
    </div>
  );
}
