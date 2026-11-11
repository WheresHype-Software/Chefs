import type { ReactNode } from "react";
import { ChefHat } from "@/components/brand/ChefHat";

export type Role = "client" | "chef";

function Plate({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="13" r="6.5" />
      <circle cx="12" cy="13" r="3.2" />
      <path d="M3 4v5.5M1.8 4v3.2a1.2 1.2 0 0 0 2.4 0V4M21 4c-1.4 0-2.2 1.8-2.2 4.2 0 1.3.6 2 1.4 2.2V20" />
    </svg>
  );
}

function Option({ onPick, dark, icon, title, text }: { onPick: () => void; dark?: boolean; icon: ReactNode; title: string; text: string }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`group flex min-h-[92px] w-full cursor-pointer items-center gap-4 rounded-[14px] border-2 px-4 py-4 text-left font-[inherit] transition-[transform,border-color,background-color] active:scale-[0.99] ${
        dark ? "border-ink bg-ink text-white hover:bg-ink-2" : "border-line-2 bg-white text-ink hover:border-cobalt hover:bg-cobalt-soft"
      }`}
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] ${dark ? "bg-white/10 text-yolk" : "bg-cobalt-soft text-cobalt"}`}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[18px] font-bold leading-tight">{title}</span>
        <span className={`text-[14px] leading-snug ${dark ? "text-[#c9d6ee]" : "text-muted"}`}>{text}</span>
      </span>
      <span
        aria-hidden="true"
        className={`text-[22px] transition-transform group-hover:translate-x-0.5 ${dark ? "text-yolk" : "text-cobalt"}`}
      >
        →
      </span>
    </button>
  );
}

/**
 * The question asked before any account is created: to book, or to cook. Neither is chosen by
 * default, and the form only appears after a choice. People who came to cook kept creating client
 * accounts from the general sign-in page and got stuck with that email; asking first stops it.
 */
export function RoleChoice({ onPick }: { onPick: (role: Role) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[17px] font-semibold">Como vai usar o Ao Lume?</p>
      <Option
        onPick={() => onPick("client")}
        icon={<Plate />}
        title="Quero reservar"
        text="Encontrar chefs e cozinheiros, e pedir jantares, marmitas ou bolos."
      />
      <Option
        dark
        onPick={() => onPick("chef")}
        icon={<ChefHat size={30} />}
        title="Quero cozinhar"
        text="Criar a minha página de chef e receber pedidos de clientes."
      />
    </div>
  );
}
