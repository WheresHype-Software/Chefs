"use client";

import { useOptimistic, useState, useTransition } from "react";
import { deletePhoto, movePhoto } from "@/app/dashboard/actions/photos";
import type { FormMessageValue } from "@/components/ui/FormMessage";
import { callAction } from "@/lib/call-action";
import type { ChefPhoto } from "@/lib/dashboard";

export type PhotoMove = "first" | -1 | 1;
type Change = { type: "delete"; id: string } | { type: "move"; id: string; to: PhotoMove };

function reorder(list: ChefPhoto[], change: Change): ChefPhoto[] {
  const from = list.findIndex((p) => p.id === change.id);
  if (from < 0) return list;
  const next = [...list];
  if (change.type === "delete") {
    next.splice(from, 1);
    return next;
  }
  const to = change.to === "first" ? 0 : Math.min(list.length - 1, Math.max(0, from + change.to));
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

/** Dish photos with optimistic reordering and deleting; a failed save rolls back and shows why. */
export function useDishPhotos(gallery: ChefPhoto[]) {
  const [message, setMessage] = useState<FormMessageValue | null>(null);
  const [, start] = useTransition();
  const [dishes, apply] = useOptimistic(gallery, reorder);

  function change(c: Change, run: () => ReturnType<typeof movePhoto>) {
    setMessage(null);
    start(async () => {
      apply(c);
      const r = await callAction(run);
      if (!r.ok) setMessage({ ok: false, text: r.error });
    });
  }

  return {
    dishes,
    message,
    setMessage,
    move: (id: string, to: PhotoMove) => change({ type: "move", id, to }, () => movePhoto(id, to)),
    remove: (id: string) => change({ type: "delete", id }, () => deletePhoto(id)),
  };
}
