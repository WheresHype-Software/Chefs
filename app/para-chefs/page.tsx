import type { Metadata } from "next";
import Link from "next/link";
import { Compare, HeroStage, ToolTabs } from "@/components/ParaChefsWidgets";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Para chefs",
  description: "Página de reservas, calendário, chat e avaliações para chefs privados e cozinheiros caseiros. Grátis e sem comissões.",
};

const TOOLS: [string, string, boolean][] = [
  ["Calendário", "Dias livres, bloqueios e área de serviço.", true],
  ["Chat com clientes", "Uma conversa por reserva, sem perder mensagens.", true],
  ["Ofertas e menus", "Preço fixo, por pessoa ou sob orçamento.", true],
  ["Cancelamento", "Flexível, moderado, rígido ou à sua medida.", true],
  ["Categorias de cozinha", "Até três, para os clientes o encontrarem no filtro do mapa.", true],
  ["Deslocações e entregas", "Moradas, raio, zonas, taxas e o percurso do dia.", true],
  ["Levantamentos", "Horários na sua cozinha e código de confirmação.", true],
  ["Sinal por MB WAY", "Peça o sinal sem sair da reserva.", false],
  ["Lembretes WhatsApp", "Confirmação e lembrete da véspera para o cliente.", false],
  ["Lista de clientes", "Quem volta, o que pediu e as suas alergias.", false],
  ["Estatísticas", "Visitas ao perfil, pedidos e taxa de aceitação.", false],
  ["Faturação", "Recibos e faturas ligados a cada reserva.", false],
];

const MKT = [
  ["Um link para a bio", "aolume.pt/chef/o-seu-nome substitui o formulário e o “manda mensagem”."],
  ["Kit de partilha", "Código QR, imagens para stories e cartões com as suas melhores avaliações."],
  ["No mapa, perto de quem procura", "Clientes da sua zona encontram-no sem saberem o seu nome."],
  ["Avaliações verificadas", "Só quem concluiu uma reserva avalia, e pode responder a cada uma."],
  ["Destaque para quem começa", "Novos talentos aparecem na página inicial nas primeiras semanas."],
  ["Encomendas de época", "Bolo-rei, folar, sardinhadas de junho: abra pré-encomendas com data limite."],
];

const FAQ = [
  [
    "Quanto custa?",
    "No lançamento é gratuito e não há comissão por reserva. Mais tarde haverá um plano Pro opcional, com ferramentas extra e destaque pago no mapa.",
  ],
  ["Como recebo o pagamento?", "Diretamente do cliente, por MB WAY, transferência ou dinheiro. O Ao Lume não toca no seu dinheiro."],
  [
    "Sou cozinheiro caseiro. Posso entrar?",
    "Sim. Há perfis de chef profissional e de cozinheiro caseiro, e todos são revistos pela nossa equipa antes de aparecerem no mapa.",
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
              Criar perfil grátis
            </Link>
            <a href="#ferramenta" className="btn btn-o">
              Ver a ferramenta
            </a>
          </div>
          <span className="al-in text-sm text-muted" style={{ animationDelay: "340ms" }}>
            Sem comissões · o cliente paga-lhe diretamente
          </span>
        </div>
        <HeroStage />
      </section>

      <Compare />

      <section id="ferramenta" className="bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-11 px-5 py-14 md:px-10 md:py-[120px]">
          <div className="al-rv flex max-w-[760px] flex-col gap-4">
            <h2 className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">Tudo o que um pedido precisa, num só sítio.</h2>
          </div>
          <ToolTabs />
        </div>
      </section>

      <section className="mx-auto flex max-w-[1280px] flex-col gap-12 px-5 py-14 md:px-10 md:py-[120px]">
        <div className="al-rv flex flex-wrap items-end justify-between gap-5">
          <h2 className="d m-0 max-w-[760px] text-[clamp(32px,6vw,68px)] leading-none">O essencial de quem cozinha por conta própria.</h2>
          <span className="lab text-muted">Grátis no lançamento · Pro mais tarde</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-x-10 border-t border-line-2">
          {TOOLS.map(([t, d, free]) => (
            <div key={t} className="al-rv flex flex-col gap-1.5 border-b border-line pb-5 pt-5 md:gap-2.5 md:pb-[30px] md:pr-7 md:pt-7">
              <div className="flex items-baseline justify-between gap-3">
                <span className="d text-xl leading-[1.15] md:text-2xl">{t}</span>
                <span className={`lab whitespace-nowrap ${free ? "text-ink" : "text-muted"}`}>{free ? "Grátis" : "Pro"}</span>
              </div>
              <span className="text-[15px] text-muted">{d}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="marketing" className="bg-cobalt-deep text-white">
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
                <span className="d text-[30px]">Novo talento</span>
                <span className="text-sm text-[#c9d6ee]">Destaque na página inicial nas primeiras semanas.</span>
              </div>
              <div className="flex flex-col gap-2 bg-cobalt-deep p-[26px]">
                <span className="lab text-[#c9d6ee]">5 reservas · 4,5 ou mais</span>
                <span className="d text-[30px]">Chef em ascensão</span>
                <span className="text-sm text-[#c9d6ee]">Sobe no mapa para os clientes da sua zona.</span>
              </div>
              <div className="flex flex-col gap-2 bg-white p-[26px] text-ink">
                <span className="lab text-muted">25 reservas · 4,7 ou mais</span>
                <span className="d text-[30px]">Top chef</span>
                <span className="text-sm text-ink-3">Aparece primeiro e entra nas seleções Ao Lume.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1280px] flex-wrap items-end gap-14 px-5 py-14 md:px-10 md:py-[120px]">
        <div className="al-rv flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
          <h2 className="d m-0 text-[clamp(32px,6vw,68px)] leading-none">O dinheiro é seu. Todo.</h2>
          <p className="m-0 max-w-[520px] text-lg text-ink-3">
            O Ao Lume liga-o ao cliente e organiza a reserva. Preço, sinal e regras de cancelamento são definidos por si, e o cliente
            paga-lhe diretamente.
          </p>
        </div>
        <div className="al-rv grid min-w-0 flex-[1_1_420px] grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] border-t border-line-2">
          <div className="flex flex-col gap-2 pr-6 pt-6">
            <span className="lab">Ao Lume</span>
            <span className="d text-[clamp(64px,9vw,104px)] leading-none">0 %</span>
            <span className="text-sm text-muted">de comissão por reserva</span>
          </div>
          <div className="flex flex-col gap-2 pt-6 text-muted">
            <span className="lab">Plataformas internacionais</span>
            <span className="d text-[clamp(64px,9vw,104px)] leading-none line-through decoration-1">20 %</span>
            <span className="text-sm">ou mais, por reserva, mais taxas</span>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-11 px-5 py-14 md:px-10 md:py-[120px]">
          <h2 className="d al-rv m-0 text-[clamp(32px,6vw,68px)] leading-none">Entrar leva dez minutos.</h2>
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-x-10 border-t border-line-2 p-0">
            {[
              ["1", "Crie a conta", "Nome, email e o tipo de perfil: profissional ou caseiro."],
              ["2", "Mostre o seu trabalho", "Uma fotografia sua, o Instagram ou site, e três fotos de pratos."],
              ["3", "Aprovação", "A nossa equipa revê cada perfil antes de entrar no mapa."],
              ["4", "Partilhe o link", "Ponha aolume.pt/chef/o-seu-nome na bio e receba pedidos."],
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

      <section id="perguntas" className="bg-paper">
        <div className="mx-auto flex max-w-[1280px] flex-wrap gap-12 px-5 py-14 md:px-10 md:py-[120px]">
          <div className="flex-[1_1_280px]">
            <h2 className="d al-rv m-0 text-[clamp(32px,6vw,68px)] leading-none">Perguntas</h2>
          </div>
          <div className="min-w-0 flex-[2_1_520px] border-t border-line-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group border-b border-line-2 py-[18px]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  <span className="d text-[22px] leading-[1.2]">{q}</span>
                  <span
                    aria-hidden="true"
                    className="text-2xl font-light leading-none transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mb-1.5 mt-2.5 max-w-[640px] text-base text-ink-3">{a}</p>
              </details>
            ))}
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
          <span className="text-[15px] text-[#c9d6ee]">Gratuito no lançamento, sem contrato.</span>
        </div>
      </section>

      <SiteFooter chefs />
    </div>
  );
}
