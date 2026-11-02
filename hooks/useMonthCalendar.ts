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
  const [userMoved, setUserMoved] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [noneSoon, setNoneSoon] = useState(false);

  // An empty month says "nothing here" when the next one may be full: skip ahead on our own,
  // during render (no effect), at most three months, and never once the person has navigated.
  // If all are empty, come back to this month and say there are no free days soon.
  if (!userMoved && !noneSoon && hasCurrent && loaded.data && loaded.data.available.length === 0) {
    if (skipped < 3) {
      setSkipped(skipped + 1);
      const d = new Date(month.year, month.month + 1, 1);
      setMonth({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      setNoneSoon(true);
      setMonth({ year: now.getFullYear(), month: now.getMonth() });
    }
  }

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
    setUserMoved(true);
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
    /** No free days in this month or the next three. */
    noneSoon,
    retry: () => setAttempt((n) => n + 1),
    shift,
  };
}
