import type { Map as MLMap } from "maplibre-gl";
import { fromPrice, initials, titledName } from "@/lib/format";
import type { ChefCard } from "@/lib/types";

/**
 * Map pins, styled by .al-pin and .al-group in globals.css. Built as plain DOM because MapLibre
 * markers take an element, not a React tree.
 *
 * A pin is the chef's face (initials when there is no photo) with the starting price under it,
 * sitting right on the spot: no tall stem, so neighbours don't cover each other's names. Chefs
 * too close to tell apart at the current zoom are drawn as one group instead (see groupChefs).
 */

/** The round face: the photo, or the initials when there is none or it fails to load. */
function face(chef: ChefCard, className: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = className;
  const showInitials = () => {
    span.replaceChildren();
    const ini = document.createElement("span");
    ini.className = "ini d";
    ini.textContent = initials(chef.name);
    span.append(ini);
  };
  if (chef.portrait) {
    const img = document.createElement("img");
    // The stored photo as is, like the result cards: the browser already has it cached from them.
    img.src = chef.portrait;
    img.alt = "";
    img.decoding = "async";
    img.addEventListener("error", showInitials, { once: true });
    span.append(img);
  } else showInitials();
  return span;
}

/**
 * `delayMs` staggers the drop-in on the map's first draw; without it the marker appears still,
 * as pins that come and go while zooming should.
 */
export function createPin(chef: ChefCard, onPick: (id: string) => void, delayMs?: number): HTMLDivElement {
  const node = document.createElement("div");
  node.className = "al-pin";
  const bub = document.createElement("div");
  bub.className = "al-bub";
  if (delayMs === undefined) node.dataset.still = "";
  else bub.style.animationDelay = `${delayMs}ms`;
  const button = document.createElement("button");
  button.type = "button";
  button.append(face(chef, "face"));
  const price = document.createElement("span");
  price.className = "price";
  price.textContent = fromPrice(chef.offers).replace("orçamento", "Orçamento");
  button.append(price);
  button.setAttribute("aria-label", [titledName(chef), chef.headline, chef.area].filter(Boolean).join(", "));
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    onPick(chef.id);
  });
  const foot = document.createElement("span");
  foot.className = "foot";
  bub.append(button, foot);
  node.append(bub);
  return node;
}

/** Several chefs in one spot: up to two faces, "+n", and how many. Clicking zooms in on them. */
export function createGroup(chefs: ChefCard[], onOpen: () => void, delayMs?: number): HTMLDivElement {
  const node = document.createElement("div");
  node.className = "al-group";
  if (delayMs === undefined) node.dataset.still = "";
  const button = document.createElement("button");
  button.type = "button";
  if (delayMs !== undefined) button.style.animationDelay = `${delayMs}ms`;
  const stack = document.createElement("span");
  stack.className = "stack";
  chefs.slice(0, 2).forEach((c) => stack.append(face(c, "sface")));
  if (chefs.length > 2) {
    const more = document.createElement("span");
    more.className = "more";
    more.textContent = `+${chefs.length - 2}`;
    stack.append(more);
  }
  const label = document.createElement("span");
  label.className = "count";
  label.textContent = `${chefs.length} chefs`;
  button.append(stack, label);
  button.setAttribute("aria-label", `${chefs.length} chefs nesta zona: aproximar o mapa`);
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    onOpen();
  });
  node.append(button);
  return node;
}

/**
 * Chefs that would overlap on screen at the current zoom, put together. Greedy, in screen pixels:
 * each chef joins the first group whose first member is closer than `radius`. `alone` (the
 * selected or hovered chef) is never grouped, so the one being looked at is always visible.
 */
export function groupChefs(m: MLMap, chefs: ChefCard[], alone: Set<string>, radius = 58): ChefCard[][] {
  const groups: { at: { x: number; y: number }; chefs: ChefCard[] }[] = [];
  for (const c of chefs) {
    const at = m.project([c.lng, c.lat]);
    if (alone.has(c.id)) {
      groups.push({ at, chefs: [c] });
      continue;
    }
    const near = groups.find((g) => !alone.has(g.chefs[0]!.id) && Math.hypot(g.at.x - at.x, g.at.y - at.y) < radius);
    if (near) near.chefs.push(c);
    else groups.push({ at, chefs: [c] });
  }
  return groups.map((g) => g.chefs);
}
