"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { AzulejoField } from "@/components/brand/Azulejo";

export type MenuLink = { href: string; label: string; badge?: number };

type Props = {
  links: MenuLink[];
  /** Brand shown in the menu's top bar, matching the page header. */
  brand: ReactNode;
  /** Buttons under the links (sign in, sign out, CTAs). */
  actions?: ReactNode;
  /** Shows a dot on the menu button, e.g. requests waiting for an answer. */
  alert?: boolean;
};

function isCurrent(path: string, href: string): boolean {
  const target = href.split(/[?#]/)[0]!;
  if (!target || href.includes("#")) return false;
  return target === "/" || target === "/dashboard" ? path === target : path.startsWith(target);
}

/** Phones: a full-screen menu on a native <dialog> (focus trap, Escape and inert page for free). */
export function MobileMenu({ links, brand, actions, alert = false }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const path = usePathname();

  // Navigating away closes the menu.
  useEffect(() => {
    dialog.current?.close();
  }, [path]);

  function show() {
    dialog.current?.showModal();
    setOpen(true);
  }

  // Any link inside closes the menu, so same-page anchors scroll into a visible page.
  function onClick(e: MouseEvent<HTMLDialogElement>) {
    if ((e.target as Element).closest("a")) dialog.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative -mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink hover:bg-paper md:hidden"
      >
        <span className="sr-only">Abrir menu</span>
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
          <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {alert && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-yolk ring-2 ring-white" aria-hidden="true" />}
      </button>

      <dialog
        ref={dialog}
        aria-label="Menu"
        onClose={() => setOpen(false)}
        onClick={onClick}
        className="menu-sheet m-0 h-dvh max-h-none w-full max-w-none border-0 bg-white p-0 text-ink md:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
            {brand}
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink hover:bg-paper"
            >
              <span className="sr-only">Fechar menu</span>
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav aria-label="Menu" className="flex-1 overflow-y-auto px-5 pt-2">
            <ul className="m-0 list-none p-0">
              {links.map((l) => {
                const current = isCurrent(path, l.href);
                return (
                  <li key={l.href} className="border-b border-line">
                    <Link
                      href={l.href}
                      aria-current={current ? "page" : undefined}
                      className={`flex items-center justify-between gap-3 py-4 text-[22px] font-bold tracking-[-0.01em] no-underline ${current ? "text-cobalt" : "text-ink"}`}
                    >
                      <span className="flex items-center gap-3">
                        {current && <span className="h-2.5 w-2.5 rounded-[2px] bg-cobalt" aria-hidden="true" />}
                        {l.label}
                      </span>
                      {l.badge ? (
                        <span className="num rounded-full bg-yolk-soft px-2.5 py-0.5 text-sm font-semibold text-ink">{l.badge}</span>
                      ) : (
                        <span aria-hidden="true" className="text-lg text-faint">
                          →
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {actions && <div className="flex flex-col gap-3 py-6">{actions}</div>}
          </nav>

          <div className="h-10 shrink-0 overflow-hidden" aria-hidden="true">
            <AzulejoField variant="glaze" size={40} />
          </div>
        </div>
      </dialog>
    </>
  );
}
