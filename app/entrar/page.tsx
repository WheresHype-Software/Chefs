import type { Metadata } from "next";
import { SignInForm } from "@/components/SignInForm";
import { SiteHeader } from "@/components/SiteChrome";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  const sp = await searchParams;
  const asChef = sp.chef === "1";
  const next = typeof sp.next === "string" ? sp.next : asChef ? "/dashboard/perfil" : "/dashboard";
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader chefs={asChef} />
      <div className="mx-auto flex max-w-[1080px] flex-wrap gap-14 px-5 py-16 md:px-8 md:py-24">
        <div className="flex flex-[1_1_340px] flex-col gap-5">
          <h1 className="d m-0 text-[clamp(40px,6vw,64px)] leading-none">{asChef ? "Crie o seu perfil de chef." : "Entrar no Ao Lume."}</h1>
          <p className="m-0 max-w-[460px] text-ink-3">
            {asChef
              ? "Conta, fotografia, Instagram ou site e três fotos de pratos. A nossa equipa revê cada perfil antes de aparecer no mapa."
              : "Clientes não precisam de conta para pedir uma reserva: o link no email abre o pedido e a conversa. A conta guarda o histórico e os chefs favoritos."}
          </p>
          {sp.erro === "link" && (
            <p role="alert" className="m-0 text-sm text-danger">
              O link expirou ou já foi usado. Peça um novo.
            </p>
          )}
        </div>
        <div className="box flex-[1_1_380px] p-7">
          {hasSupabase ? (
            <SignInForm next={next} asChef={asChef} />
          ) : (
            <div className="flex flex-col gap-3">
              <span className="d text-2xl">Modo de demonstração</span>
              <p className="m-0 text-sm text-muted">
                A autenticação liga-se quando o projeto Supabase estiver configurado. Até lá pode ver o painel do chef com dados de exemplo.
              </p>
              <a href="/dashboard" className="btn self-start">
                Ver painel de exemplo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
