import type { Metadata } from "next";
import { ChefHat } from "@/components/brand/ChefHat";
import { SignInForm } from "@/components/SignInForm";
import { SignInMosaic } from "@/components/SignInMosaic";
import { SiteHeader } from "@/components/SiteChrome";
import { Photo } from "@/components/ui/Photo";
import { PHOTOS } from "@/lib/photos";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({ searchParams }: PageProps<"/[locale]/entrar">) {
  const sp = await searchParams;
  const asChef = sp.chef === "1";
  const startOnSignup = sp.criar === "1";
  // Same-site paths only: "//host" or "/\host" would send a fresh sign-in off-site.
  const next = typeof sp.next === "string" && /^\/(?![/\\])/.test(sp.next) ? sp.next : asChef ? "/dashboard/comecar" : "/dashboard";

  const expired =
    sp.erro === "link" ? (
      <p role="alert" className="m-0 text-sm text-danger">
        Esta ligação expirou ou já foi usada. Entre com o email e a palavra-passe, ou peça uma nova em «Esqueceu-se da palavra-passe?».
      </p>
    ) : null;

  const demo = (
    <div className="flex flex-col gap-3">
      <span className="d text-2xl">Modo de demonstração</span>
      <p className="m-0 text-sm text-muted">
        A autenticação liga-se quando o projeto Supabase estiver configurado. Até lá pode ver o painel do chef com dados de exemplo.
      </p>
      <a href="/dashboard" className="btn self-start">
        Ver painel de exemplo
      </a>
    </div>
  );

  /*
   * O lado dos chefs tem a sua própria entrada, e tem de se notar: quem clicou no painel escuro
   * do ecrã anterior precisa de saber que chegou onde queria. Faz isso com a cozinha em fundo, o
   * cobalto da casa e o barrete, em vez de uma página inteira a preto, que pesava de mais.
   */
  if (asChef) {
    return (
      <div className="min-h-screen bg-paper">
        <SiteHeader chefs />
        {/* Uma faixa com a cozinha lá dentro, em cobalto e não em preto: distingue o lado dos
            chefs tão bem como o escuro distinguia, sem a página inteira ficar pesada. */}
        <section className="relative isolate overflow-hidden">
          <Photo photo={PHOTOS.cooking} sizes="100vw" priority className="absolute inset-0 -z-20 h-full w-full" />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,rgb(18_48_110/0.96)_38%,rgb(18_48_110/0.76)_100%)]"
          />
          <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 py-12 md:px-8 md:py-16">
            <ChefHat size={48} className="text-yolk" />
            <h1 className="d m-0 max-w-[16ch] text-[clamp(32px,5vw,52px)] leading-[1.02] text-white">
              Vista a jaleca.
              <br />
              <span className="text-yolk">O resto é connosco.</span>
            </h1>
            <p className="m-0 max-w-[52ch] text-[17px] text-[#d6e1f5]">
              Crie a sua página, decida os menus, os dias e os preços, e receba pedidos de quem está perto de si.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1180px] items-start gap-10 px-5 py-10 md:px-8 md:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="al-in flex flex-col gap-3">
              <h2 className="d m-0 text-[clamp(24px,3vw,32px)] leading-[1.05]">Crie o seu perfil de chef.</h2>
              <p className="m-0 max-w-[480px] text-[16px] text-ink-3">
                Conta, fotografia, Instagram ou site e três fotos de pratos. A nossa equipa revê cada perfil antes de aparecer nas
                pesquisas. Os dados fiscais e o IBAN só são pedidos mais tarde, antes do primeiro pagamento.
              </p>
              {expired}
            </div>
            <div className="box al-in min-w-0 max-w-[480px] p-5 shadow-[0_24px_60px_-30px_rgb(20_32_51/0.4)] [animation-delay:120ms] sm:p-7">
              {hasSupabase ? <SignInForm next={next} asChef /> : demo}
            </div>
            <a href="/entrar" className="w-fit text-[14px] text-muted no-underline hover:text-ink">
              Afinal só quero reservar um chef →
            </a>
          </div>
          <div className="hidden lg:block">
            <SignInMosaic forChefs />
          </div>
        </div>
      </div>
    );
  }

  /*
   * Uma porta só. Quem já tem conta entra sem escolher nada: a conta sabe se é de chef ou de
   * cliente. Quem cria conta responde primeiro «Quero reservar» ou «Quero cozinhar», e só depois
   * vê o formulário. Antes havia dois lados lado a lado, e mesmo assim houve chefs a criar conta
   * de cliente pelo lado errado e a ficar presos com esse email.
   */
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <div className="mx-auto grid max-w-[1180px] items-start gap-10 px-5 py-8 md:px-8 md:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="al-in flex flex-col gap-2">
            <h1 className="d m-0 text-[clamp(30px,4vw,44px)] leading-[1.03]">Entrar no Ao Lume</h1>
            <p className="m-0 max-w-[460px] text-[16px] text-ink-3">
              Para quem quer comer bem e para quem cozinha. Se ainda não tem conta, diga-nos primeiro como a vai usar.
            </p>
            {expired}
          </div>
          <div className="box al-in w-full min-w-0 max-w-[480px] p-5 shadow-[0_24px_60px_-30px_rgb(20_32_51/0.4)] [animation-delay:120ms] sm:p-7">
            {hasSupabase ? <SignInForm next={next} asChef={false} startOnSignup={startOnSignup} /> : demo}
          </div>
          <p className="m-0 max-w-[480px] text-[14px] text-muted">
            Para pedir uma reserva não precisa de conta: o link no email abre o pedido e a conversa com o chef.
          </p>
        </div>
        <div className="hidden lg:block">
          <SignInMosaic forChefs={false} />
        </div>
      </div>
    </div>
  );
}
