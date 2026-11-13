import type { Metadata } from "next";
import { getPublicSettings } from "@/lib/settings";
import { Link } from "@/lib/i18n/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SupportForm } from "@/components/SupportForm";
import { COMPANY, COMPLAINTS_BOOK_URL, EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Apoio",
  description: "Fale connosco sobre uma reserva, um pagamento ou a sua conta no Ao Lume.",
  alternates: { canonical: "/apoio" },
};

const CONTACTS: { label: string; address: string; what: string }[] = [
  { label: "Apoio", address: EMAIL.support, what: "reservas, pagamentos, a sua conta" },
  { label: "Privacidade", address: EMAIL.privacy, what: "aceder, corrigir ou apagar os seus dados" },
  { label: "Jurídico", address: EMAIL.legal, what: "termos, conteúdos, moderação" },
];

export default async function ApoioPage() {
  const { paymentsEnabled: paymentsOn } = await getPublicSettings();
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto box-border flex w-full max-w-[920px] flex-1 flex-col gap-8 px-5 pb-20 pt-10 md:px-8 md:pt-14">
        <div className="flex flex-col gap-3">
          <h1 className="d m-0 text-[clamp(32px,5vw,48px)] leading-[1.05]">Como podemos ajudar?</h1>
          <p className="m-0 max-w-[62ch] text-muted">
            Escreva-nos e respondemos normalmente no mesmo dia útil. Se for sobre uma reserva, indique o número do pedido: poupa-nos uma
            troca de emails.
          </p>
        </div>

        <SupportForm />

        <section className="flex flex-col gap-4">
          <h2 className="d m-0 text-[28px]">Perguntas frequentes sobre pagamentos</h2>
          <dl className="m-0 flex flex-col gap-4">
            {/* Enquanto a app não cobrar nada, estas respostas descreviam um caminho que não
                existe: um cliente lia-as, esperava um email com o valor, e nunca o recebia. */}
            {paymentsOn ? (
              <>
                <div>
                  <dt className="m-0 font-semibold">Quando pago o sinal?</dt>
                  <dd className="m-0 text-muted">
                    Só depois de o chef aceitar o seu pedido. Recebe um email com o valor e o prazo, e paga na página da reserva por MB WAY
                    ou por referência Multibanco.
                  </dd>
                </div>
                <div>
                  <dt className="m-0 font-semibold">E o resto do valor?</dt>
                  <dd className="m-0 text-muted">
                    É combinado e pago diretamente ao chef. O Ao Lume só recebe o sinal, e só para garantir a reserva.
                  </dd>
                </div>
                <div>
                  <dt className="m-0 font-semibold">O chef cancelou. Recebo o dinheiro de volta?</dt>
                  <dd className="m-0 text-muted">
                    Sim, o sinal é devolvido por inteiro. Se pagou por MB WAY ou cartão, volta pelo mesmo caminho; se pagou por referência
                    Multibanco, pedimos-lhe o IBAN na página da sua reserva. Nunca por email nem por telefone.
                  </dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt className="m-0 font-semibold">Quando e como pago?</dt>
                  <dd className="m-0 text-muted">
                    Só depois de o chef aceitar o seu pedido. O pagamento, incluindo qualquer sinal, é combinado diretamente entre si e o
                    chef, pelos meios que ele aceitar. O Ao Lume não cobra nada ao cliente.
                  </dd>
                </div>
                <div>
                  <dt className="m-0 font-semibold">O chef cancelou. E o que já lhe paguei?</dt>
                  <dd className="m-0 text-muted">
                    Fale com ele pela página da reserva, onde fica registo da conversa. Se não chegarem a acordo, escreva-nos: ajudamos a
                    resolver e isso conta para a conta dele no Ao Lume.
                  </dd>
                </div>
              </>
            )}
            <div>
              <dt className="m-0 font-semibold">Alguém me pediu o IBAN por mensagem. É do Ao Lume?</dt>
              <dd className="m-0 text-muted">
                Não. Só lhe pedimos dados bancários dentro da página da sua reserva, com a sessão aberta. Se receber um pedido por email,
                SMS ou telefone, não responda e avise-nos em <a href={`mailto:${EMAIL.support}`}>{EMAIL.support}</a>.
              </dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 className="d m-0 text-[22px]">Outras formas de falar connosco</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {CONTACTS.map((c) => (
              <li key={c.address} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                <span className="lab text-muted">{c.label}</span>
                <a href={`mailto:${c.address}`}>{c.address}</a>
                <span className="text-muted">· {c.what}</span>
              </li>
            ))}
          </ul>
          <p className="m-0 text-sm text-muted">
            {COMPANY.name}, NIF {COMPANY.nif} · {COMPANY.address}
          </p>
          <p className="m-0 text-sm text-muted">
            Pode também usar o{" "}
            <a href={COMPLAINTS_BOOK_URL} target="_blank" rel="noopener noreferrer">
              Livro de Reclamações
            </a>
            , ou ler os nossos <Link href="/termos">termos</Link> e a <Link href="/privacidade">política de privacidade</Link>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
