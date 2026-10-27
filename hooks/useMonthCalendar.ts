"use client";

import { useEffect, useState } from "react";
import { loadCalendar } from "@/app/actions";
import type { Calendar } from "@/lib/types";

/** Month navigation plus the chef's available/booked days for the visible month. */
export function useMonthCalendar(chefId: string) {
  const [now] = useState(() => new Date());
  const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [attempt, setAttempt] = useState(0);
  const key = `${chefId}:${month.year}-${month.month}:${attempt}`;
  const [loaded, setLoaded] = useState<{ key: string; data: Calendar | null } | null>(null);

  useEffect(() => {
    let live = true;
    loadCalendar(chefId, month.year, month.month)
      .then((data) => live && setLoaded({ key, data }))
      // null data = the days could not be loaded; the calendar offers a retry.
      .catch(() => live && setLoaded({ key, data: null }));
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
    failed: loaded?.key === key && loaded.data === null,
    retry: () => setAttempt((n) => n + 1),
    canGoBack: month.year > now.getFullYear() || month.month > now.getMonth(),
    shift,
  };
}
