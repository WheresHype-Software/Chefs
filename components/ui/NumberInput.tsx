"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "min" | "max"> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Allow decimals (prices, km); typed with a comma or a dot. */
  decimal?: boolean;
  /** Value used when the field is left empty; null keeps it empty. */
  emptyValue?: number | null;
};

const format = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

function parse(text: string): number | null {
  const n = Number(text.replace(",", "."));
  return text.trim() === "" || Number.isNaN(n) ? null : n;
}

/**
 * Number field that keeps what the person types (so "1" can be cleared to write "50"),
 * reports the parsed number as they type, and clamps to min/max when they leave the field.
 */
export function NumberInput({ value, onChange, min, max, decimal = false, emptyValue = null, onBlur, onFocus, ...rest }: Props) {
  const [text, setText] = useState(() => format(value));
  const [synced, setSynced] = useState(value);
  const [editing, setEditing] = useState(false);

  // The parent changed the value (reset, another control): show it, but never while the person types.
  if (value !== synced) {
    setSynced(value);
    if (!editing && parse(text) !== value) setText(format(value));
  }

  function commit(next: number | null) {
    setSynced(next);
    onChange(next);
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={text}
      onFocus={(e) => {
        setEditing(true);
        onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(decimal ? /[^\d.,]/g : /\D/g, "");
        setText(raw);
        commit(parse(raw));
      }}
      onBlur={(e) => {
        let n = parse(text);
        if (n == null) n = emptyValue;
        if (n != null && min != null) n = Math.max(min, n);
        if (n != null && max != null) n = Math.min(max, n);
        setEditing(false);
        setText(format(n));
        commit(n);
        onBlur?.(e);
      }}
    />
  );
}
