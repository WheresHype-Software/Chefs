import Link from "next/link";
import type { ReactNode } from "react";
import { ChefHat } from "@/components/brand/ChefHat";
import { ChefDoor } from "@/components/auth/ChefDoor";
import { Photo } from "@/components/ui/Photo";
import { PHOTOS } from "@/lib/photos";

/**
 * Duas portas de entrada, não uma com um atalho ao lado.
 *
 * Havia um formulário só e a palavra «chef» apenas no cabeçalho, por cima. Quem vinha cozinhar
 * chegava aqui, via uma caixa de email e palavra-passe, e criava uma conta de cliente sem saber
 * que havia outra coisa — e ficava preso, porque o mesmo email não serve duas vezes. Aconteceu
 * no primeiro dia a sério.
 *
 * No ecrã grande são dois lados do mesmo ecrã, separados por uma diagonal: lê-se antes de se ler
 * uma palavra. No telemóvel não há dois lados, há um de cada vez — e aí o perigo volta, porque o
 * lado dos chefs fica abaixo da dobra e quem desce o polegar encontra primeiro o formulário de
 * cliente. Por isso o telemóvel leva a tira escura em cima, antes do formulário: pequena, mas no
 * caminho de toda a gente.
 */
export function AuthSplit({ form, chefHref }: { form: ReactNode; chefHref: string }) {
  const bullets = ["Sem mensalidades", "Decide os menus, os dias e os preços", "Perfil criado em poucos minutos"];

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[0.95fr_1.05fr]">
      {/* ------------------------------------------------------------ cliente -- */}
      <div className="order-2 flex flex-col justify-center gap-6 px-5 py-10 sm:px-8 lg:order-1 lg:py-14 lg:pl-[max(2rem,calc((100vw-1240px)/2))] lg:pr-16">
        <div className="flex w-full max-w-[460px] flex-col gap-6">
          <div aria-hidden="true" className="grid grid-cols-3 gap-2">
            {[PHOTOS.table, PHOTOS.cake, PHOTOS.plated].map((photo, i) => (
              <div
                key={photo.id}
                className="tile-set aspect-[4/3] overflow-hidden rounded-[10px]"
                style={{ animationDelay: `${120 + i * 80}ms` }}
              >
                <Photo photo={photo} sizes="(min-width: 1024px) 14vw, 30vw" priority={i === 0} className="h-full w-full" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="lab text-muted">Quero reservar</span>
            <h1 className="d m-0 text-[clamp(28px,3.4vw,40px)] leading-[1.05]">Entrar no Ao Lume.</h1>
            <p className="m-0 text-[15px] text-ink-3">
              Para pedir uma reserva nem precisa de conta: o link no email abre o pedido e a conversa. A conta guarda o histórico e os chefs
              favoritos.
            </p>
          </div>
          {form}
        </div>
      </div>

      {/* No telemóvel o lado dos chefs fica abaixo da dobra; esta tira põe-no antes do formulário. */}
      <ChefDoor href={chefHref} className="order-1 sm:px-8 lg:hidden" />

      {/* --------------------------------------------------------------- chef -- */}
      <div className="relative isolate order-3 flex flex-col justify-center gap-6 overflow-hidden px-5 py-12 text-white sm:px-8 lg:order-2 lg:py-14 lg:pl-[16%] lg:pr-[max(2rem,calc((100vw-1240px)/2))] lg:[clip-path:polygon(10%_0,100%_0,100%_100%,0_100%)]">
        <Photo photo={PHOTOS.cooking} sizes="(min-width: 1024px) 55vw, 100vw" className="absolute inset-0 -z-20 h-full w-full" />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgb(20_32_51/0.97)_35%,rgb(20_32_51/0.74)_100%)]"
        />

        <div className="flex max-w-[420px] flex-col gap-5">
          <ChefHat size={46} className="text-yolk" />
          <div className="flex flex-col gap-2.5">
            <span className="lab text-[#9fb4d8]">Quero cozinhar</span>
            <p className="d m-0 text-[clamp(30px,3.6vw,44px)] leading-[1.02] text-white">
              Vista a jaleca.
              <br />
              <span className="text-yolk">O resto é connosco.</span>
            </p>
            <p className="m-0 text-[15px] text-[#c9d6ee]">
              Crie a sua página, decida os menus, os dias e os preços, e receba pedidos de quem está perto de si.
            </p>
          </div>

          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[14px] text-[#c9d6ee]">
            {bullets.map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="shrink-0 text-yolk"
                  aria-hidden="true"
                >
                  <path d="M5 12.5 10 17 19 7" />
                </svg>
                {t}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <Link href={chefHref} className="btn !bg-white !text-ink w-fit no-underline hover:!bg-[#e4ecf8]">
              Criar perfil de chef
            </Link>
            <span className="text-[13px] text-[#9fb4d8]">Já é chef no Ao Lume? É por aqui que entra também.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
