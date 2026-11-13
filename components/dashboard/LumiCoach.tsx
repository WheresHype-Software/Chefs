"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { setLumi } from "@/app/dashboard/actions/lumi";
import { Lumi, type LumiMood } from "@/components/Lumi";
import { useServerAction } from "@/hooks/useServerAction";

/** What Lumi says beside one part of the form; `target` is that part's `data-lumi` name. */
export type LumiTip = { mood: LumiMood; title: string; text: string; target: string; link?: { href: string; label: string } };

const noop = () => () => {};

/** "Só por agora": hidden until the browser closes, on this device only (sessionStorage). */
const LATER = "aolume:lumi-later";
const laterListeners = new Set<() => void>();
function readLater(): boolean {
  try {
    return sessionStorage.getItem(LATER) === "1";
  } catch {
    return false;
  }
}
function hideForNow() {
  try {
    sessionStorage.setItem(LATER, "1");
  } catch {
    // Blocked storage: she stays hidden on this page only, which still answers the tap.
  }
  laterListeners.forEach((l) => l());
}
function subscribeLater(onChange: () => void) {
  laterListeners.add(onChange);
  return () => {
    laterListeners.delete(onChange);
  };
}
const WIDE = "(min-width: 1024px)";
function subscribeWide(onChange: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Where Lumi stands above a field or section (on narrow screens, or on pages without a rail): an
 * empty spot in the layout that her balloon fills, so it pushes the content down instead of
 * covering it. Spans the whole row when it sits in a grid.
 */
export function LumiSlot({ name }: { name: string }) {
  return <div data-lumi-slot={name} className="col-span-full w-full scroll-mt-20 empty:hidden" />;
}

/** The column beside the form where Lumi moves down to the field the chef is on. */
export function LumiRail() {
  return <div data-lumi-rail className="relative hidden lg:block" />;
}

/**
 * Lumi walking the chef through a page: she stands beside the part they're on and says, in a
 * speech balloon, what it's for. She starts at the first thing left to do and follows the chef
 * from field to field; nothing to click through. Never over the page: with a `LumiRail` on a
 * computer she stands in a column to the right, level with the field; otherwise (phones, or
 * `inline` pages whose layout has no room for a rail) she steps in above it. The ✕ turns her off
 * for the account, on every page; Perfil has the switch to bring her back. Pages only render her
 * while she's wanted (see `lumiOn`).
 *
 * With `followScroll` (steps made of big sections rather than fields, like the photos) she also
 * goes to whichever section the chef is looking at, so she explains it without a click.
 *
 * Render it with a `key` that changes with `start`, so finishing something (an upload, a step)
 * sends her on to what's next.
 */
export function LumiCoach({
  tips,
  start,
  followScroll = false,
  inline = false,
}: {
  tips: LumiTip[];
  start?: string;
  followScroll?: boolean;
  inline?: boolean;
}) {
  const tr = useTranslations("dashboard.lumi");
  // She lives in the page's layout, which only exists in the browser.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const [hidden, setHidden] = useState(false);
  // The ✕ asks first: turning her off is for the whole account, so a stray tap shouldn't do it.
  const [confirming, setConfirming] = useState(false);
  const wideScreen = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
  const wide = wideScreen && !inline;
  const [target, setTarget] = useState(start ?? tips[0]?.target);
  const [top, setTop] = useState<number | null>(null);
  // Where she's drawn: the rail, or the slot above the part she's talking about. Looked up once the
  // page is on screen; during render it may not be yet (a page reached from the menu is rendered
  // before it's attached), and looking then left her missing until the next click.
  const [host, setHost] = useState<Element | null>(null);
  // Phones: where the field the chef just entered sat on screen, so it can stay put when she moves in above it.
  const anchor = useRef<{ el: HTMLElement; top: number; scrolled?: boolean } | null>(null);
  const current = useRef(target);
  useEffect(() => {
    current.current = target;
  }, [target]);

  const tip = tips.find((t) => t.target === target) ?? tips[0];
  const later = useSyncExternalStore(subscribeLater, readLater, () => false);
  const on = mounted && !hidden && !later && Boolean(tip);

  // She follows the chef: entering a part of the form she knows about brings her there.
  useEffect(() => {
    if (!on) return;
    // A click focuses before it clicks. Moving her on that focus shifts the page between the
    // press and the release, and the browser drops the click (a calendar day needed two). So
    // while a pointer is down, she waits for the click to land, then moves.
    let pressed = false;
    let waiting: (() => void) | null = null;
    const onDown = () => {
      pressed = true;
    };
    const onUp = () => {
      pressed = false;
      const go = waiting;
      waiting = null;
      if (go) window.setTimeout(go, 0);
    };
    const onFocus = (e: FocusEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-lumi]");
      const key = el?.dataset.lumi;
      if (!el || !key || !tips.some((t) => t.target === key)) return;
      const go = () => {
        anchor.current = { el, top: el.getBoundingClientRect().top };
        setTarget(key);
      };
      if (pressed) waiting = go;
      else go();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onUp, true);
      document.removeEventListener("focusin", onFocus);
    };
  }, [on, tips]);

  // Sections: she goes to the one in front of the chef once scrolling settles (never mid-fling,
  // and never while they're typing), and starts at one that's on screen.
  useEffect(() => {
    if (!on || !followScroll) return;
    const pick = (onlyIfHidden: boolean) => {
      if (document.activeElement?.matches("input, textarea, select")) return;
      const line = window.innerHeight * 0.4;
      let best: { key: string; el: HTMLElement; d: number } | null = null;
      for (const t of tips) {
        const el = document.querySelector<HTMLElement>(`[data-lumi="${t.target}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const visible = r.bottom > 80 && r.top < window.innerHeight;
        if (t.target === current.current && onlyIfHidden && visible) return;
        if (!visible) continue;
        const d = r.top <= line && r.bottom >= line ? 0 : Math.min(Math.abs(r.top - line), Math.abs(r.bottom - line));
        if (!best || d < best.d) best = { key: t.target, el, d };
      }
      if (!best || best.key === current.current) return;
      anchor.current = { el: best.el, top: best.el.getBoundingClientRect().top, scrolled: true };
      setTarget(best.key);
    };
    pick(true);
    let timer: number | undefined;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => pick(false), 180);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [on, followScroll, tips]);

  // The part she's talking about gets a soft ring, so the balloon and the field read together.
  useEffect(() => {
    if (!on || !tip) return;
    const el = document.querySelector<HTMLElement>(`[data-lumi="${tip.target}"]`);
    el?.classList.add("lumi-target");
    return () => el?.classList.remove("lumi-target");
  }, [on, tip]);

  // Phones: she steps in above the field, so scroll by what that moved it; the field being typed
  // in stays where the chef's eyes and keyboard are.
  useLayoutEffect(() => {
    const a = anchor.current;
    // Wait for her to be in the new spot: measuring before would see the field unmoved.
    if (!a || wide || host?.getAttribute("data-lumi-slot") !== target) return;
    anchor.current = null;
    const delta = a.el.getBoundingClientRect().top - a.top;
    if (Math.abs(delta) > 1) window.scrollBy(0, delta);
    if (a.scrolled) return;
    // If that left her above the screen, bring her down just far enough to be read.
    document.querySelector(`[data-lumi-slot="${target}"]`)?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [host, target, wide]);

  useLayoutEffect(() => {
    if (!on || !tip) return;
    const find = () => {
      const next = wide
        ? document.querySelector("[data-lumi-rail]")
        : (document.querySelector(`[data-lumi-slot="${tip.target}"]`) ?? document.querySelector("[data-lumi-slot]"));
      setHost((prev) => (prev === next ? prev : next));
    };
    find();
    // Parts of the page get rebuilt (another month in the calendar, the offer form closing): when
    // her spot goes with them, find the new one.
    const mo = new MutationObserver(() => {
      setHost((prev) => {
        if (prev?.isConnected) return prev;
        return wide
          ? document.querySelector("[data-lumi-rail]")
          : (document.querySelector(`[data-lumi-slot="${tip.target}"]`) ?? document.querySelector("[data-lumi-slot]"));
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [on, wide, tip]);

  // Computers: keep her level with the field, also when the form above it grows or shrinks.
  useLayoutEffect(() => {
    if (!on || !wide || !tip) return;
    const rail = document.querySelector<HTMLElement>("[data-lumi-rail]");
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-lumi="${tip.target}"]`);
      if (!rail || !el) return setTop(0);
      setTop(Math.max(0, el.getBoundingClientRect().top - rail.getBoundingClientRect().top - 8));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [on, wide, tip]);

  if (!on || !tip) return null;

  if (!host) return null;

  const body = (
    <aside key={tip.target} aria-label={tr("label")} className="flex items-start gap-1">
      <span className="lumi-hop mt-3 shrink-0">
        <Lumi mood={tip.mood} size={wide ? 76 : wideScreen ? 64 : 52} animated />
      </span>
      <div className="lumi-pop relative min-w-0 flex-1 rounded-[18px] border border-line-2 bg-white py-3 pl-4 pr-10 shadow-[0_10px_30px_-12px_rgba(20,32,51,0.25)]">
        {/* The balloon's tail, pointing at Lumi. */}
        <span aria-hidden="true" className="absolute -left-[7px] top-7 h-3.5 w-3.5 rotate-45 border-b border-l border-line-2 bg-white" />
        {confirming ? (
          <div className="flex flex-col gap-2" role="group" aria-label={tr("hideGroup")}>
            <p className="m-0 text-sm font-semibold text-ink">{tr("hideQuestion")}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-o btn-sm min-h-11" onClick={hideForNow}>
                {tr("justNow")}
              </button>
              <button
                type="button"
                className="btn btn-o btn-sm min-h-11"
                onClick={() => {
                  setHidden(true);
                  void setLumi(false);
                }}
              >
                {tr("never")}
              </button>
            </div>
            <p className="m-0 text-[13px] text-muted">{tr("explain")}</p>
            <button
              type="button"
              className="min-h-11 self-start text-[13px] text-muted underline hover:text-ink"
              onClick={() => setConfirming(false)}
            >
              {tr("cancel")}
            </button>
          </div>
        ) : (
          <>
            <h2 className="m-0 text-[15px] font-bold text-ink" aria-live="polite">
              {tip.title}
            </h2>
            <p className="m-0 mt-1 text-sm leading-relaxed text-ink-3">
              {tip.text}
              {tip.link && (
                <>
                  {" "}
                  <Link href={tip.link.href}>{tip.link.label}</Link>
                </>
              )}
            </p>
          </>
        )}
        <button
          type="button"
          hidden={confirming}
          onClick={() => setConfirming(true)}
          aria-label={tr("turnOff")}
          title={tr("turnOff")}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-faint hover:text-ink"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </aside>
  );

  return createPortal(
    wide ? (
      <div className="absolute inset-x-0 transition-[top] duration-500 ease-out motion-reduce:transition-none" style={{ top: top ?? 0 }}>
        {body}
      </div>
    ) : (
      <div className="py-1">{body}</div>
    ),
    host,
  );
}

/**
 * Where Lumi would be, once the chef turned her off: one quiet link to bring her back. Pages that
 * guide (onboarding, the first-steps pages) show it, so turning her off is never a one-way door,
 * even before the chef can reach the switch in Perfil.
 */
export function LumiRestore() {
  const tr = useTranslations("dashboard.lumi");
  const save = useServerAction(setLumi);
  return (
    <button
      type="button"
      disabled={save.pending}
      onClick={() => save.run(true)}
      className="flex min-h-11 items-center gap-2 self-start text-[13px] text-muted underline hover:text-cobalt"
    >
      <Lumi mood="espera" size={32} />
      {save.pending ? tr("activating") : tr("show")}
    </button>
  );
}
