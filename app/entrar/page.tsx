import type { Metadata } from "next";
import { SignInForm } from "@/components/SignInForm";
import { SignInMosaic } from "@/components/SignInMosaic";
import { SiteHeader } from "@/components/SiteChrome";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  const sp = await searchParams;
  const asChef = sp.chef === "1";
  // Same-site paths only: "//host" or "/\host" would send a fresh sign-in off-site.
  const next = typeof sp.next === "string" && /^\/(?![/\\])/.test(sp.next) ? sp.next : asChef ? "/dashboard/perfil" : "/dashboard";
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader chefs={asChef} />
      <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-5 py-10 md:px-8 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="lg:hidden">
            <SignInMosaic forChefs={asChef} />
          </div>
          <div className="al-in flex flex-col gap-4">
            <h1 className="d m-0 text-[clamp(36px,5vw,56px)] leading-[1.02]">
              {asChef ? "Crie o seu perfil de chef." : "Entrar no Ao Lume."}
            </h1>
            <p className="m-0 max-w-[480px] text-[17px] text-ink-3">
              {asChef
                ? "Conta, fotografia, Instagram ou site e três fotos de pratos. A nossa equipa revê cada perfil antes de aparecer nas pesquisas."
                : "Clientes não precisam de conta para pedir uma reserva: o link no email abre o pedido e a conversa. A conta guarda o histórico e os chefs favoritos."}
            </p>
            {sp.erro === "link" && (
              <p role="alert" className="m-0 text-sm text-danger">
                Esta ligação expirou ou já foi usada. Entre com o email e a palavra-passe, ou peça uma nova em «Esqueceu-se da
                palavra-passe?».
              </p>
            )}
          </div>
          <div className="box al-in min-w-0 max-w-[480px] p-5 shadow-[0_24px_60px_-30px_rgb(20_32_51/0.4)] [animation-delay:120ms] sm:p-7">
            {hasSupabase ? (
              <SignInForm next={next} asChef={asChef} />
            ) : (
              <div className="flex flex-col gap-3">
                <span className="d text-2xl">Modo de demonstração</span>
                <p className="m-0 text-sm text-muted">
                  A autenticação liga-se quando o projeto Supabase estiver configurado. Até lá pode ver o painel do chef com dados de
                  exemplo.
                </p>
                <a href="/dashboard" className="btn self-start">
                  Ver painel de exemplo
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="hidden lg:block">
          <SignInMosaic forChefs={asChef} />
        </div>
      </div>
    </div>
  );
}
