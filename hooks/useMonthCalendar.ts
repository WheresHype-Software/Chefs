"use client";

import { useEffect, useState } from "react";
import { loadCalendar } from "@/app/actions";
import type { Calendar } from "@/lib/types";

/** Month navigation plus the chef's available/booked days for the visible month. */
export function useMonthCalendar(chefId: string) {
  const [now] = useState(() => new Date());
  const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const key = `${chefId}:${month.year}-${month.month}`;
  const [loaded, setLoaded] = useState<{ key: string; data: Calendar } | null>(null);

  useEffect(() => {
    let live = true;
    loadCalendar(chefId, month.year, month.month)
      .then((data) => live && setLoaded({ key, data }))
      .catch(() => live && setLoaded({ key, data: { available: [], booked: [] } }));
    return () => {
      live = false;
    };
  }, [chefId, month.year, month.month, key]);

  function shift(delta: number) {
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return {
    ...month,
    calendar: loaded?.key === key ? loaded.data : null,
    canGoBack: month.year > now.getFullYear() || month.month > now.getMonth(),
    shift,
  };
}
