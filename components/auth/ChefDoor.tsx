import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { ChefHat } from "@/components/brand/ChefHat";

/**
 * A entrada dos chefs, escura e com o barrete, onde quer que um cozinheiro possa passar sem a
 * ver: no topo do ecrã de entrada no telemóvel, e dentro do menu.
 *
 * Existe porque uma linha de texto entre outras não chegava. Quem vinha cozinhar lia a navegação
 * toda sem perceber que havia um lado para si, criava conta de cliente, e ficava preso com esse
 * email. Aqui é um bloco inteiro, escuro no meio do branco, e não se confunde com uma secção.
 */
export function ChefDoor({ href = "/entrar?chef=1", className = "" }: { href?: string; className?: string }) {
  const t = useTranslations("home.chefDoor");
  return (
    <Link href={href} className={`flex items-center gap-3.5 bg-ink px-5 py-4 text-white no-underline hover:bg-ink-2 ${className}`}>
      <ChefHat size={30} className="shrink-0 text-yolk" />
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold">{t("title")}</span>
        <span className="text-[13px] text-[#c9d6ee]">{t("text")}</span>
      </span>
      <span aria-hidden="true" className="ml-auto text-yolk">
        →
      </span>
    </Link>
  );
}
