import { fromPrice, initials, titledName } from "@/lib/format";
import type { ChefCard } from "@/lib/types";

/**
 * A chef's map pin (styled by .al-pin in globals.css): initials and starting price on a stem.
 * Built as plain DOM because MapLibre markers take an element, not a React tree.
 */
export function createPin(chef: ChefCard, onPick: (id: string) => void, delayMs = 0): HTMLDivElement {
  const node = document.createElement("div");
  node.className = "al-pin";
  node.innerHTML = `
    <div class="al-bub" style="display:flex;flex-direction:column;align-items:center">
      <button type="button"><span class="ini d"></span><span class="price"></span></button>
      <span class="stem"></span><span class="foot"></span>
    </div>`;
  (node.firstElementChild as HTMLElement).style.animationDelay = `${delayMs}ms`;
  const button = node.querySelector("button")!;
  button.querySelector(".ini")!.textContent = initials(chef.name);
  button.querySelector(".price")!.textContent = fromPrice(chef.offers).replace("orçamento", "Orçamento");
  button.setAttribute("aria-label", [titledName(chef), chef.headline, chef.area].filter(Boolean).join(", "));
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    onPick(chef.id);
  });
  return node;
}
