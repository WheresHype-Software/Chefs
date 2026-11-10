import type { LumiTip } from "@/components/dashboard/LumiCoach";

/**
 * What Lumi says on the dashboard pages, one short tip per part of the page and no more: enough
 * to show how the page works the first time, not a manual. Each `target` is a `data-lumi` name on
 * that page. The onboarding steps have their own, in onboarding-tips.ts.
 */

export function agendaTips(openDays: number): { tips: LumiTip[]; start: string } {
  return {
    start: openDays === 0 ? "semana" : "calendario",
    tips: [
      {
        target: "semana",
        mood: openDays === 0 ? "ola" : "dica",
        title: "Os seus dias fixos",
        text: "Escolha os dias da semana em que costuma cozinhar e guarde: ficam abertos todas as semanas, sem ter de voltar cá todos os meses.",
      },
      {
        target: "calendario",
        mood: "dica",
        title: "Os seus dias abertos",
        text: "Toque num dia para o abrir ou fechar, por exemplo numa folga ou num dia extra; fica guardado de imediato. Os clientes só podem pedir nos dias abertos.",
      },
    ],
  };
}

export function offerTips(activeOffers: number): { tips: LumiTip[]; start: string } {
  return {
    start: "ofertas",
    tips: [
      activeOffers === 0
        ? {
            target: "ofertas",
            mood: "ola",
            title: "Crie a sua primeira oferta",
            text: "Uma oferta é o que os clientes reservam: um menu, uma caixa ou uma encomenda. Comece por uma, com um título claro e o preço.",
          }
        : {
            target: "ofertas",
            mood: "dica",
            title: "As suas ofertas",
            text: "Pode ter várias, para ocasiões diferentes. Desmarque «Visível no perfil» nas que não pode fazer por agora.",
          },
      {
        target: "oferta-titulo",
        mood: "dica",
        title: "Título e descrição",
        text: "Um título que diga o que é, e na descrição os pratos e o que está incluído. É o que ajuda o cliente a decidir.",
      },
      {
        target: "oferta-onde",
        mood: "dica",
        title: "Onde é servida",
        text: "Em casa do cliente, entregue na morada dele ou levantada na sua cozinha. Cada oferta tem o seu modo.",
      },
      {
        target: "oferta-preco",
        mood: "dica",
        title: "Como cobra",
        text: "Por pessoa ou unidade, um valor fixo, ou sob orçamento quando cada pedido é diferente, por exemplo em eventos.",
      },
      {
        target: "oferta-horas",
        mood: "dica",
        title: "Horas",
        text: "Toque nas horas a que pode servir. Ao pedir, o cliente escolhe uma delas.",
      },
      {
        target: "oferta-antecedencia",
        mood: "dica",
        title: "Antecedência",
        text: "Com quantas horas de aviso precisa de receber um pedido. Os clientes não conseguem pedir com menos tempo do que isso.",
      },
    ],
  };
}

export const COOKING_TIPS: LumiTip[] = [
  {
    target: "categorias",
    mood: "dica",
    title: "Categorias de cozinha",
    text: "Escolha até cinco: é por elas que os clientes o encontram na pesquisa. Se a sua cozinha não estiver na lista, pode acrescentá-la.",
  },
  {
    target: "servicos",
    mood: "dica",
    title: "Serviços que oferece",
    text: "Ative apenas o que faz de facto. Os serviços aparecem no seu perfil e os clientes filtram a pesquisa por eles.",
  },
];

export const PHOTO_TIPS: LumiTip[] = [
  {
    target: "retrato",
    mood: "dica",
    title: "A sua fotografia",
    text: "Nítida, de frente e com boa luz. É a primeira coisa que um cliente vê antes de o receber em casa.",
  },
  {
    target: "pratos",
    mood: "dica",
    title: "Os seus pratos",
    text: "Escreva o que é cada prato e ordene-os: a primeira fotografia é a capa nos resultados de pesquisa.",
  },
];
