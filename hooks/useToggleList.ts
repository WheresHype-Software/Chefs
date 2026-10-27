"use client";

import { useState } from "react";

/** A list of selected values with a toggle; `max` caps how many can be selected. */
export function useToggleList<T>(initial: T[], max = Infinity) {
  const [items, setItems] = useState<T[]>(initial);
  const has = (v: T) => items.includes(v);
  const canAdd = items.length < max;
  const toggle = (v: T) => setItems((list) => (list.includes(v) ? list.filter((x) => x !== v) : list.length < max ? [...list, v] : list));
  return { items, has, toggle, canAdd, setItems };
}
