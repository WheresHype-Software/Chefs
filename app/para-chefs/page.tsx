import type { Metadata } from "next";
import Link from "next/link";
import { Faq, type FaqItem } from "@/components/ui/Faq";
import { Compare } from "@/components/para-chefs/Compare";
import { HeroStage } from "@/components/para-chefs/HeroStage";
import { RequestDemo } from "@/components/para-chefs/RequestDemo";
import { ToolList } from "@/components/para-chefs/ToolList";
import { ToolTabs } from "@/components/para-chefs/ToolTabs";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE_DOMAIN } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Para chefs",
  description: "Página de reservas, calendário, chat e avaliações para chefs privados e cozinheiros caseiros.",
};

const MKT = [
  ["Um link para a bio", `${SITE_DOMAIN}/chef/o-seu-nome substitui o formulário e o “manda mensagem”.`],
  ["Kit de partilha", "Código QR, imagens para stories e cartões com as suas melhores avaliações."],
  ["Perto de quem procura", "Clientes da sua zona encontram-no sem saberem o seu nome."],
  ["Avaliações verificadas", "Só quem concluiu uma reserva avalia, e pode responder a cada uma."],
  ["Título de Chef verificado", "Envie um certificado de cozinha e apareça como Chef, com a marca «Chef verificado»."],
  ["Encomendas de época", "Bolo-rei, folar, sardinhadas de junho: abra pré-encomendas com data limite."],
];

const FAQ: FaqItem[] = [
  ["Como recebo o pagamento?", "Diretamente do cliente, por MB WAY, transferência ou dinheiro. O Ao Lume não toca no seu dinheiro."],
  [
    "Sou cozinheiro caseiro. Posso entrar?",
    "Sim. Todos começam como Cozinheiro e são revistos pela nossa equipa antes de aparecerem nas pesquisas. Quem tem formação em cozinha envia o certificado e passa a aparecer como Chef.",
  ],
  [
    "Preciso de licenças?",
    "Cada chef é responsável pelas regras da sua atividade, como a formação em HACCP e a declaração de atividade nas Finanças. Vamos publicar um guia para ajudar.",
  ],
  [
    "E se um cliente cancelar?",
    "Define a sua política de cancelamento: flexível, moderada, rígida ou à sua medida. O cliente vê-a antes de pedir.",
  ],
];

export default function ParaChefs() {
  return (
    <div>
      <SiteHeader chefs />

      <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-14 px-5 pb-[72px] pt-[88px] md:px-10">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-7">
          <h1 className="d al-in m-0 text-[clamp(48px,8.4vw,104px)] leading-[.94] tracking-[-0.02em]" style={{ animationDelay: "80ms" }}>
            Cozinhe.
            <br />
            As reservas
            <br />
            <span className="text-cobalt">tratamos nós.</span>
          </h1>
          <p className="al-in m-0 max-w-[500px] text-lg text-ink-3" style={{ animationDelay: "180ms" }}>
            Troque o Google Forms, as mensagens no Instagram e o caderno de encomendas por uma página de reservas com calendário, chat e
            avaliações.
          </p>
          <div className="al-in flex flex-wrap gap-2.5" style={{ animationDelay: "260ms" }}>
            <Link href="/entrar?chef=1" className="btn">
              Criar o meu perfil
            </Link>
            <a href="#ferramenta" className="btn btn-o">
              Ver a ferramenta
            </a>
          </div>
          <span className="al-in text-sm text-muted" style={{ animationDelay: "340ms" }}>
            Cada perfil é revisto pela equipa · o cliente paga-lhe diretamente
          </span>
        </div>
        <HeroStage />
      </section>

      <section id="demo" aria-labelledby="demo-title" className="scroll-mt-16 border-y border-line bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-5 py-14 md:px-10 md:py-24">
          <div className="al-rv flex max-w-[760px] flex-col gap-3">
            <h2 id="demo-title" className="d m-0 text-[clamp(32px,5vw,56px)] leading-none">
              Experimente: assim chega uma reserva.
            </h2>
            <p className="m-0 text-lg text-ink-3">
              Os clientes encontram-no no Ao Lume ou pelo seu link, escolhem um menu e um dia livre e enviam o pedido. Faça de chef e leve
              este pedido de exemplo até ao fim.
            </p>
          </div>
          <RequestDemo />
        </div>
      </section>

      <Compare />

      <section id="ferramenta" className="scroll-mt-16 bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-11 px-5 py-14 md:px-10 md:py-[120px]">
          <div className="al-rv flex max-w-[760px] flex-col gap-4">
            <h2 className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">Tudo o que um pedido precisa, num só sítio.</h2>
          </div>
          <ToolTabs />
        </div>
      </section>

      <section
        aria-labelledby="ferramentas-title"
        className="mx-auto flex max-w-[1280px] flex-col gap-10 px-5 py-14 md:px-10 md:py-[120px]"
      >
        <div className="al-rv flex max-w-[760px] flex-col gap-3">
          <h2 id="ferramentas-title" className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">
            O essencial de quem cozinha por conta própria.
          </h2>
          <p className="m-0 text-lg text-ink-3">Tudo o que precisa para receber e organizar pedidos já está incluído.</p>
        </div>
        <ToolList />
      </section>

      <section id="marketing" className="scroll-mt-16 bg-cobalt-deep text-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-14 px-5 py-14 md:px-10 md:py-[120px]">
          <div className="al-rv flex max-w-[820px] flex-col gap-[18px]">
            <h2 className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">Mais clientes, sem pagar anúncios.</h2>
            <p className="m-0 max-w-[600px] text-lg text-[#c9d6ee]">
              Cada cliente satisfeito e cada partilha no Instagram trazem o próximo. Nós damos-lhe as peças.
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-x-10 border-t border-white">
            {MKT.map(([t, d]) => (
              <div key={t} className="al-rv flex flex-col gap-2 border-b border-[#2a4a86] pb-6 pt-6 md:gap-3 md:pb-[34px] md:pt-7">
                <span className="d text-[22px] leading-[1.12] md:text-[26px]">{t}</span>
                <span className="text-[15px] text-[#c9d6ee]">{d}</span>
              </div>
            ))}
          </div>
          <div className="al-rv flex flex-col gap-[26px]">
            <h3 className="d m-0 text-[clamp(30px,4vw,44px)]">O seu percurso</h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-px border border-[#2a4a86] bg-[#2a4a86]">
              <div className="flex flex-col gap-2 bg-cobalt-deep p-[26px]">
                <span className="lab text-[#c9d6ee]">À entrada</span>
                <span className="d text-[30px]">Cozinheiro</span>
                <span className="text-sm text-[#c9d6ee]">Todos começam aqui e recebem pedidos desde o primeiro dia.</span>
              </div>
              <div className="flex flex-col gap-2 bg-white p-[26px] text-ink">
                <span className="lab text-muted">Com certificado verificado</span>
                <span className="d text-[30px]">Chef</span>
                <span className="text-sm text-ink-3">
                  Envie um certificado de cozinha no painel. Depois de verificado, aparece como Chef, com a marca «Chef verificado».
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1280px] flex-wrap items-end gap-14 px-5 py-14 md:px-10 md:py-[120px]">
        <div className="al-rv flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
          <h2 className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">Recebe diretamente do cliente.</h2>
          <p className="m-0 max-w-[520px] text-lg text-ink-3">
            O Ao Lume liga-o ao cliente e organiza a reserva. O dinheiro não passa por nós: o cliente paga-lhe a si.
          </p>
        </div>
        <ul className="al-rv m-0 grid min-w-0 flex-[1_1_420px] list-none grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-px border border-line bg-line p-0">
          {[
            ["Preço", "Fixo, por pessoa ou sob orçamento. Decide você."],
            ["Sinal", "A percentagem que quiser, para confirmar a data."],
            ["Pagamento", "MB WAY, transferência ou dinheiro, como combinarem."],
          ].map(([t, d]) => (
            <li key={t} className="flex flex-col gap-1.5 bg-white p-5">
              <strong className="text-[18px]">{t}</strong>
              <span className="text-[15px] text-muted">{d}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-11 px-5 py-14 md:px-10 md:py-[120px]">
          <h2 className="d al-rv m-0 text-[clamp(32px,6vw,68px)] leading-none">Entrar leva dez minutos.</h2>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-x-10 border-t border-line-2 p-0">
            {[
              ["1", "Crie a conta", "Nome, email e uma palavra-passe."],
              ["2", "Mostre o seu trabalho", "Uma fotografia sua, o Instagram ou site, e três fotos de pratos."],
              ["3", "Aprovação", "A nossa equipa revê cada perfil antes de ficar público."],
              ["4", "Partilhe o link", `Ponha ${SITE_DOMAIN}/chef/o-seu-nome na bio e receba pedidos.`],
            ].map(([n, t, d]) => (
              <li key={n} className="al-rv flex flex-col gap-2.5 border-b border-line pb-[30px] pt-[26px]">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-cobalt text-[18px] font-extrabold text-white"
                >
                  {n}
                </span>
                <strong className="text-lg font-semibold">{t}</strong>
                <span className="text-muted">{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="perguntas" className="scroll-mt-16 bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-wrap gap-12 px-5 py-14 md:px-10 md:py-[120px]">
          <div className="flex-[1_1_280px]">
            <h2 className="d al-rv m-0 text-[clamp(32px,6vw,68px)] leading-none">Perguntas</h2>
          </div>
          <div className="min-w-0 flex-[2_1_520px]">
            <Faq items={FAQ} />
          </div>
        </div>
      </section>

      <section className="bg-cobalt-deep text-white">
        <div className="al-rv mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-5 py-20 text-center md:px-10 md:py-[120px]">
          <h2 className="d m-0 max-w-[900px] text-[clamp(42px,7vw,88px)] leading-[.98]">
            Vista a jaleca.
            <br />
            <span className="text-yolk">O resto é connosco.</span>
          </h2>
          <Link href="/entrar?chef=1" className="btn btn-w">
            Criar o meu perfil
          </Link>
        </div>
      </section>

      <SiteFooter chefs />
    </div>
  );
}
