import type { Metadata } from "next";
import Link from "next/link";
import { GuestLookupForm, RecentBookings } from "@/components/booking/GuestLookup";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Acompanhar pedido", robots: { index: false } };

/** Guests (no account) get back to their booking: this device's list, or number + email. */
export default async function AcompanharPedido({ searchParams }: PageProps<"/pedido">) {
  const { ref } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[760px] flex-1 flex-col gap-8 px-5 pb-16 pt-8 md:px-8 md:pt-12">
        <div className="flex flex-col gap-2">
          <h1 className="d m-0 text-[clamp(32px,5vw,48px)] leading-[1.05]">Acompanhar um pedido</h1>
          <p className="m-0 max-w-[60ch] text-muted">
            Veja o estado do seu pedido e fale com o chef. Não precisa de conta: use o link que guardou, ou procure abaixo.
          </p>
        </div>
        <RecentBookings />
        <GuestLookupForm initialRef={typeof ref === "string" ? ref : ""} />
        <p className="m-0 text-sm text-muted">
          Prefere ter tudo num só sítio? <Link href="/entrar">Crie uma conta com o mesmo email</Link> e os seus pedidos aparecem lá
          automaticamente.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
