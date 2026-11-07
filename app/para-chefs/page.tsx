import type { Metadata } from "next";
import Link from "next/link";
import { Faq, type FaqItem } from "@/components/ui/Faq";
import { Compare } from "@/components/para-chefs/Compare";
import { FeeCalculator } from "@/components/para-chefs/FeeCalculator";
import { HeroStage } from "@/components/para-chefs/HeroStage";
import { MarketingTiles } from "@/components/para-chefs/MarketingTiles";
import { Promises } from "@/components/para-chefs/Promises";
import { RequestDemo } from "@/components/para-chefs/RequestDemo";
import { ToolList } from "@/components/para-chefs/ToolList";
import { ToolTabs } from "@/components/para-chefs/ToolTabs";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE_DOMAIN } from "@/lib/constants";
import { VerifiedIcon } from "@/components/ui/VerifiedIcon";
import { revealDelay } from "@/lib/motion";
import { getPublicSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { paymentsEnabled } = await getPublicSettings();
  return {
    title: "Para chefs",
    description: paymentsEnabled
      ? "Montra, pedidos, agenda e avaliações para chefs privados e cozinheiros caseiros. O cliente paga o sinal na app; pagamos-te depois do serviço."
      : "Montra, pedidos, agenda e avaliações para chefs privados e cozinheiros caseiros. Sem mensalidades e sem comissões.",
  };
}

const faq = (paymentsOn: boolean, pct: string): FaqItem[] => [
  [
    "Quanto custa?",
    paymentsOn
      ? `Criar o perfil, aparecer nas pesquisas e receber pedidos não tem custo. Só cobramos quando ganha: uma comissão de ${pct}% sobre o valor da reserva, descontada ao sinal que o cliente paga na app. A percentagem em vigor está sempre no seu painel, e qualquer alteração é avisada com pelo menos 30 dias.`
      : "Hoje, nada: criar o perfil, aparecer nas pesquisas, receber pedidos e combinar o serviço não têm custo nenhum, e não cobramos comissão. Mais à frente passará a haver uma comissão por cada reserva garantida, sempre descontada ao que o cliente paga e nunca cobrada a si à parte. Quem já cá estiver é avisado com pelo menos 30 dias.",
  ],
  [
    "Como recebo o pagamento?",
    paymentsOn
      ? "O sinal é pago pelo cliente na app e fica à sua ordem. Depois de concluir o serviço, transferimo-lo para o seu IBAN já com a comissão descontada, acompanhado de um documento com os seus dados fiscais, o sinal recebido, a comissão e o valor transferido. O restante valor do serviço continua a ser combinado e pago diretamente entre si e o cliente."
      : "Diretamente do cliente, como combinarem entre os dois: o Ao Lume não toca no dinheiro. A app serve para o encontrar, organizar o pedido e guardar a conversa.",
  ],
  [
    "E se eu cancelar depois de aceitar?",
    paymentsOn
      ? "O sinal é devolvido por inteiro ao cliente e não cobramos comissão nenhuma. Cancelamentos repetidos são tidos em conta na sua conta."
      : "Avise o cliente pela página da reserva, para ficar registo. Cancelamentos repetidos são tidos em conta na sua conta.",
  ],
  ...(paymentsOn
    ? ([
        [
          "Que dados preciso de dar?",
          "Nome legal, NIF, morada fiscal e IBAN, em Painel → Faturação. A lei obriga-nos também a comunicar à Autoridade Tributária, uma vez por ano, quanto recebeu através da plataforma (DAC7), e dizemos-lhe sempre o que foi comunicado.",
        ],
      ] as FaqItem[])
    : ([
        [
          "Que dados preciso de dar?",
          "Só o que aparece no perfil: quem é, onde cozinha e o que faz. Enquanto o pagamento for combinado diretamente consigo, não lhe pedimos NIF nem IBAN.",
        ],
      ] as FaqItem[])),
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

// The commission is a business setting, so the page states whatever it actually is, and is
// rebuilt hourly rather than on every visit.
export const revalidate = 3600;

export default async function ParaChefs() {
  const settings = await getPublicSettings();
  const pct = String(settings.commissionPercent).replace(".", ",");
  const paymentsOn = settings.paymentsEnabled;
  return (
    <div>
      <SiteHeader chefs />

      <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-14 px-5 pb-[72px] pt-[88px] md:px-10">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-7">
          <h1 className="d al-in m-0 text-[clamp(48px,8.4vw,104px)] leading-[.94] tracking-[-0.02em]" style={{ animationDelay: "80ms" }}>
            Viva da sua
            <br />
            <span className="text-cobalt">cozinha.</span>
          </h1>
          <p className="al-in m-0 max-w-[500px] text-lg text-ink-3" style={{ animationDelay: "180ms" }}>
            Montra, clientes novos, pedidos, agenda e avaliações, num só sítio. Jantares em casa, eventos, marmitas, bolos ou salgados:
            escolhe o que faz, quando e por quanto.
          </p>
          <div className="al-in" style={{ animationDelay: "220ms" }}>
            <Promises />
          </div>
          <div className="al-in flex flex-wrap gap-2.5" style={{ animationDelay: "260ms" }}>
            <Link href="/entrar?chef=1" className="btn">
              Criar o meu perfil
            </Link>
            <a href="#ferramenta" className="btn btn-o">
              Ver a ferramenta
            </a>
          </div>
          <span className="al-in text-sm text-muted" style={{ animationDelay: "340ms" }}>
            {paymentsOn
              ? "Cada perfil é revisto pela equipa · o sinal é pago na app"
              : "Cada perfil é revisto pela equipa · sem mensalidades e sem comissões"}
          </span>
        </div>
        <HeroStage />
      </section>

      <section id="ferramenta" className="scroll-mt-16 bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-11 px-5 py-14 md:px-10 md:py-[120px]">
          <div className="al-rv flex max-w-[760px] flex-col gap-4">
            <h2 className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">Tudo o que um pedido precisa, num só sítio.</h2>
          </div>
          <ToolTabs />
        </div>
      </section>

      <section aria-labelledby="zona-title" className="border-y border-line bg-yolk-soft">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-9 px-5 py-14 md:px-10 md:py-20">
          <div className="al-rv flex max-w-[760px] flex-col gap-3">
            <h2 id="zona-title" className="d m-0 text-[clamp(32px,5vw,56px)] leading-none">
              Chegue primeiro à sua zona.
            </h2>
            <p className="m-0 max-w-[620px] text-lg text-ink-3">
              O Ao Lume abre zona a zona. Em cada área, os primeiros perfis aprovados são os que recebem os pedidos e os que acumulam as
              primeiras avaliações.
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-px border border-line-2 bg-line-2">
            <div className="flex flex-col gap-2 bg-white p-[26px]">
              <strong className="d text-[22px]">Posição na sua área</strong>
              <span className="text-[15px] text-ink-3">
                Cada chef define o raio onde trabalha e aparece a quem procura dentro dele. A maior parte das zonas do país ainda não tem um
                único chef aprovado.
              </span>
            </div>
            <div className="flex flex-col gap-2 bg-white p-[26px]">
              <strong className="d text-[22px]">Reputação leva tempo</strong>
              <span className="text-[15px] text-ink-3">
                As avaliações só chegam a quem já recebeu reservas. Quem começa primeiro constrói a reputação que decide as escolhas dos
                clientes seguintes.
              </span>
            </div>
            <div className="flex flex-col gap-2 bg-white p-[26px]">
              <strong className="d text-[22px]">Sem custo no lançamento</strong>
              <span className="text-[15px] text-ink-3">
                Criar o perfil, aparecer nas pesquisas e receber pedidos não tem custo. Qualquer alteração às condições é comunicada com 15
                dias de antecedência.
              </span>
            </div>
          </div>
          <div className="al-rv">
            <Link href="/entrar?chef=1" className="btn">
              Criar o meu perfil
            </Link>
          </div>
        </div>
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

      <section
        aria-labelledby="ferramentas-title"
        className="mx-auto flex max-w-[1280px] flex-col gap-10 px-5 py-14 md:px-10 md:py-[120px]"
      >
        <div className="al-rv flex max-w-[760px] flex-col gap-3">
          <h2 id="ferramentas-title" className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">
            O essencial de quem cozinha por conta própria.
          </h2>
          <p className="m-0 text-lg text-ink-3">
            Jantares em casa, eventos, marmitas da semana, bolos e salgados ou encomendas de época: tudo o que precisa para receber e
            organizar pedidos já está incluído.
          </p>
        </div>
        <ToolList />
      </section>

      <section id="marketing" className="scroll-mt-16 border-y border-line bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-16 px-5 py-14 md:px-10 md:py-[120px]">
          <div className="al-rv flex max-w-[820px] flex-col gap-[18px]">
            <h2 className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">Mais clientes, sem pagar anúncios.</h2>
            <p className="m-0 max-w-[600px] text-lg text-ink-3">
              Cada cliente satisfeito e cada partilha no Instagram trazem o próximo. Nós damos-lhe as peças.
            </p>
          </div>
          <MarketingTiles />

          <div className="al-rv flex flex-col gap-7">
            <div className="flex flex-col gap-2.5">
              <h3 className="d m-0 text-[clamp(28px,4vw,42px)] leading-none">O seu percurso</h3>
              <p className="m-0 max-w-[560px] text-ink-3">
                Recebe pedidos desde o dia em que for aprovado. O título de Chef vem depois, se tiver formação em cozinha.
              </p>
            </div>
            <ol className="m-0 grid list-none gap-px border border-line bg-line p-0 md:grid-cols-[1fr_auto_1fr]">
              <li className="flex flex-col gap-2.5 bg-paper p-7 md:p-8">
                <span className="lab text-muted">Passo 1 · à entrada</span>
                <span className="d text-[clamp(28px,4vw,36px)] leading-none">Cozinheiro</span>
                <span className="text-[15px] leading-relaxed text-ink-3">
                  Todos começam aqui. A página fica pública depois da revisão da equipa e os pedidos entram desde o primeiro dia.
                </span>
              </li>
              <li aria-hidden="true" className="flex items-center justify-center bg-white px-6 py-4 md:px-5">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cobalt">
                  <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" className="hidden md:block" />
                  <path d="M12 4v15m0 0 5.5-5.5M12 19l-5.5-5.5" className="md:hidden" />
                </svg>
              </li>
              <li className="flex flex-col gap-2.5 bg-white p-7 text-ink md:p-8">
                <span className="lab flex items-center gap-1.5 text-cobalt">
                  <VerifiedIcon size={15} />
                  Passo 2 · com certificado
                </span>
                <span className="d text-[clamp(28px,4vw,36px)] leading-none">Chef</span>
                <span className="text-[15px] leading-relaxed text-ink-3">
                  Envie um certificado de cozinha no painel. Depois de verificado, passa a aparecer como Chef, com o selo ao lado do nome em
                  todas as pesquisas.
                </span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section id="quanto-custa" className="scroll-mt-16 border-y border-line bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-12 px-5 py-14 md:px-10 md:py-[110px]">
          <div className="al-rv flex min-w-0 flex-[1_1_440px] flex-col gap-6">
            <div className="flex flex-col gap-[18px]">
              {/* A comissão é a mesma com os pagamentos ligados ou desligados: está decidida, e
                  explicá-la agora é melhor do que deixá-la para quando começar a sair da conta de
                  alguém. O que muda é o aviso em cima, que diz a quem chega hoje que ainda não paga. */}
              <span className="inline-flex w-fit items-center gap-2 bg-yolk-soft px-3 py-1.5 text-[14px] font-semibold text-ink">
                Sem mensalidades
              </span>
              <h2 className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">
                Só paga por cada
                <br />
                serviço garantido.
              </h2>
              {!paymentsOn && (
                <p className="m-0 max-w-[520px] border-l-[3px] border-yolk bg-yolk-soft px-4 py-3 text-[15px] text-ink">
                  <strong>Aos primeiros chefs não cobramos nada.</strong> Enquanto estivermos a começar, o pagamento é combinado diretamente
                  consigo e não fica cá comissão nenhuma. É assim que vai funcionar quando ligarmos os pagamentos, e quem já cá estiver é
                  avisado com pelo menos 30 dias.
                </p>
              )}
              <p className="m-0 max-w-[520px] text-lg text-ink-3">
                Nada por criar a página, nada por aparecer nas pesquisas, nada por receber pedidos. Quando o cliente paga o sinal, a data
                fica garantida e fica também a nossa comissão de {pct}% do valor da reserva, descontada a esse sinal. Sem reserva, não há
                nada a pagar.
              </p>
            </div>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {[
                ["Deixa de andar atrás de quem marca e desaparece", "O sinal confirma a data. Sem sinal, não há reserva."],
                ["Não tem de pedir dinheiro a ninguém", "O pedido do sinal parte de nós, não de si."],
                ["O dinheiro é seu desde o primeiro minuto", "Recebemo-lo em seu nome e entregamo-lo depois do serviço concluído."],
              ].map(([t, d], i) => (
                <li key={t} className="al-rv flex gap-3.5 border-t border-line pt-3.5" style={revealDelay(i)}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="mt-1 shrink-0 text-cobalt"
                    aria-hidden="true"
                  >
                    <path d="M5 12.5 10 17 19 7" />
                  </svg>
                  <span className="flex flex-col gap-0.5">
                    <strong className="text-[17px]">{t}</strong>
                    <span className="text-[15px] text-muted">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="al-rv min-w-0 flex-[1_1_380px]">
            <FeeCalculator commissionPercent={settings.commissionPercent} commissionMin={settings.commissionMin} depositPercent={30} />
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-11 px-5 py-14 md:px-10 md:py-[120px]">
          <h2 className="d al-rv m-0 text-[clamp(32px,6vw,68px)] leading-none">Criar o perfil leva poucos minutos.</h2>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-x-10 border-t border-line-2 p-0">
            {[
              ["1", "Crie a conta", "Nome, email e uma palavra-passe. Poucos minutos."],
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
            <Faq items={faq(paymentsOn, pct)} />
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
          <div className="flex justify-center">
            <Promises tone="white" />
          </div>
        </div>
      </section>

      <SiteFooter chefs />
    </div>
  );
}
