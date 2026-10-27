"use client";

import { useEffect, useState } from "react";
import type { Calendar } from "@/lib/types";

export type MonthCalendarData = { year: number; month: number; calendar: Calendar };

async function fetchMonth(chefId: string, year: number, month: number, signal: AbortSignal): Promise<Calendar> {
  const res = await fetch(`/api/calendar?chef=${encodeURIComponent(chefId)}&year=${year}&month=${month}`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`calendar ${res.status}`);
  return (await res.json()) as Calendar;
}

/**
 * Month navigation plus the chef's available/booked days for the visible month. The page can pass
 * the current month already loaded on the server, so the calendar shows without a round trip.
 */
export function useMonthCalendar(chefId: string, initial?: MonthCalendarData) {
  const [now] = useState(() => new Date());
  const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [attempt, setAttempt] = useState(0);
  const key = `${chefId}:${month.year}-${month.month}:${attempt}`;
  const initialKey = initial ? `${chefId}:${initial.year}-${initial.month}:0` : null;
  const [loaded, setLoaded] = useState<{ key: string; data: Calendar | null } | null>(
    initial && initialKey ? { key: initialKey, data: initial.calendar } : null,
  );
  const hasCurrent = loaded?.key === key;

  useEffect(() => {
    if (hasCurrent) return;
    const ctrl = new AbortController();
    fetchMonth(chefId, month.year, month.month, ctrl.signal)
      .then((data) => setLoaded({ key, data }))
      // null data = the days could not be loaded; the calendar offers a retry.
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          console.error(err);
          setLoaded({ key, data: null });
        }
      });
    return () => ctrl.abort();
  }, [chefId, month.year, month.month, key, hasCurrent]);

  function shift(delta: number) {
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return {
    ...month,
    calendar: hasCurrent ? loaded.data : null,
    failed: hasCurrent && loaded.data === null,
    canGoBack: month.year > now.getFullYear() || month.month > now.getMonth(),
    retry: () => setAttempt((n) => n + 1),
    shift,
  };
}
