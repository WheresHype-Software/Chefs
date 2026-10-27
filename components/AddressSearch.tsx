"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchPlaces, type Place } from "@/lib/geocode";

export type { Place };

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSelect: (place: Place) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  icon?: boolean;
  label: string;
};

export function AddressSearch({ value, onChange, onSelect, placeholder, className, inputClassName, icon, label }: Props) {
  const [items, setItems] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = useRef(false);
  const listId = useId();

  useEffect(() => {
    if (!typed.current || value.trim().length < 3) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchPlaces(value, { init: { signal: ctrl.signal } })
        .then((r) => {
          setItems(r);
          setOpen(r.length > 0);
          setActive(-1);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  function pick(p: Place) {
    typed.current = false;
    onChange(p.label);
    onSelect(p);
    setOpen(false);
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <label className="flex items-center gap-3">
        {icon && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        )}
        <span className="sr-only">{label}</span>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="street-address"
          value={value}
          placeholder={placeholder}
          className={inputClassName}
          onChange={(e) => {
            typed.current = true;
            onChange(e.target.value);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => items.length && setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              pick(items[active]!);
            } else if (e.key === "Escape") setOpen(false);
          }}
        />
      </label>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 border border-line bg-white shadow-[0_18px_40px_rgba(17,17,16,.12)]"
        >
          {items.map((p, i) => (
            <li
              key={`${p.lat},${p.lng},${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              className={`cursor-pointer px-4 py-3 text-sm ${i === active ? "bg-paper" : ""} border-b border-line last:border-b-0`}
            >
              {p.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
