import type { LumiTip } from "@/components/dashboard/LumiCoach";

type State = {
  step: number;
  rejected: boolean;
  hasProfile: boolean;
  social: boolean;
  portrait: boolean;
  selfie: boolean;
  dishes: number;
  ready: boolean;
};

/**
 * What Lumi says beside each part of the onboarding form, in the same formal register as the
 * rest of the dashboard, and where she starts: the first thing still to do. Mostly why each thing
 * is asked: a selfie and a link to someone's Instagram, asked without a reason, read like a hurdle.
 * Each `target` is a `data-lumi` name on the form.
 */
export function onboardingTips(s: State): { tips: LumiTip[]; start: string } {
  if (s.step === 1) {
    const name = "O nome público é como os clientes o conhecem no Ao Lume: o seu nome ou o nome com que assina a sua cozinha.";
    const tips: LumiTip[] = [
      s.rejected
        ? {
            target: "nome",
            mood: "ups",
            title: "Alguns pontos a rever",
            text: "A equipa deixou indicações no último passo. Basta corrigir esses pontos e enviar novamente.",
          }
        : s.hasProfile
          ? { target: "nome", mood: "dica", title: "Continue onde ficou", text: `Os dados que guardou estão preservados. ${name}` }
          : { target: "nome", mood: "ola", title: "Bem-vindo ao Ao Lume", text: `Sou a Lumi e vou acompanhá-lo, campo a campo. ${name}` },
      {
        target: "link",
        mood: "dica",
        title: "O endereço da sua página",
        text: "É o link para o seu perfil, fácil de encontrar e de partilhar com clientes. É criado a partir do nome público; prefira algo curto e simples.",
      },
      {
        target: "aparecer",
        mood: "dica",
        title: "Como quer aparecer",
        text: "Define o título no seu perfil público: cozinheiro ou cozinheira. Com um certificado verificado, passa a aparecer como Chef.",
      },
      {
        target: "perfil",
        mood: "dica",
        title: "Tipo de perfil",
        text: "É o que aparece no seu perfil público, junto ao nome: cozinha caseira ou profissional de cozinha. Escolha o que melhor descreve a sua experiência.",
      },
      {
        target: "frase",
        mood: "dica",
        title: "Uma frase sobre si",
        text: "Uma descrição rápida da sua cozinha, que os clientes leem logo abaixo do nome. Por exemplo: cozinha alentejana para jantares em casa.",
      },
      {
        target: "bio",
        mood: "dica",
        title: "A sua história na cozinha",
        text: "Conte como começou, onde aprendeu, o que gosta de cozinhar e como trabalha. É o que dá a conhecer quem vai cozinhar em casa do cliente.",
      },
      {
        target: "zona",
        mood: "dica",
        title: "Onde presta serviço",
        text: "Indique a zona onde quer cozinhar para os seus clientes. Os clientes veem apenas a zona, nunca a sua morada.",
      },
      {
        target: "raio",
        mood: "dica",
        title: "Até onde se desloca",
        text: "A distância, em quilómetros a partir da sua zona, que está disposto a percorrer para um serviço.",
      },
      {
        target: "social",
        mood: "dica",
        title: "Instagram ou site",
        text: "Serve só para a equipa ver que cozinha a sério: pratos que já fez, eventos, clientes. Não precisa de ser uma página profissional nem de ter muitos seguidores; uma conta pessoal com fotografias da sua comida chega.",
      },
    ];
    return { tips, start: s.hasProfile && !s.social && !s.rejected ? "social" : "nome" };
  }

  if (s.step === 2) {
    const missing = Math.max(0, 3 - s.dishes);
    const tips: LumiTip[] = [
      {
        target: "retrato",
        mood: s.portrait ? "festa" : "dica",
        title: "Fotografia de perfil",
        text: s.portrait
          ? "Fotografia carregada. Pode trocá-la quando quiser."
          : "É pública: a imagem que os clientes veem antes de o receberem em casa. Prefira uma fotografia nítida, de frente e com boa luz.",
      },
      {
        target: "selfie",
        mood: s.selfie ? "festa" : "dica",
        title: "Selfie de verificação",
        text: s.selfie
          ? "Selfie recebida. Apenas a equipa a vê e é eliminada após a aprovação."
          : "É privada e apenas a equipa tem acesso. Confirma que a fotografia de perfil é sua e é eliminada após a aprovação.",
      },
      {
        target: "pratos",
        mood: missing ? "dica" : "festa",
        title: "Fotografias de pratos",
        text: missing
          ? `${missing === 3 ? "São precisas pelo menos três." : `Falta${missing === 1 ? "" : "m"} ${missing}.`} São o que mais influencia um pedido de reserva: privilegie luz natural e o prato em destaque.`
          : "Já tem fotografias suficientes. A primeira é a capa nos resultados de pesquisa; pode reordená-las.",
      },
      {
        target: "continuar",
        mood: "festa",
        title: "Fotografias concluídas",
        text: "Pode avançar para o último passo e enviar o perfil para revisão.",
      },
    ];
    const start = !s.portrait ? "retrato" : !s.selfie ? "selfie" : missing ? "pratos" : "continuar";
    return { tips, start };
  }

  return {
    start: "enviar",
    tips: [
      s.ready
        ? {
            target: "enviar",
            mood: "festa",
            title: "Perfil pronto para revisão",
            text: "A equipa analisa cada perfil, normalmente no mesmo dia útil. O NIF e o IBAN só são pedidos antes do primeiro pagamento.",
          }
        : {
            target: "enviar",
            mood: "ups",
            title: "Ainda há elementos em falta",
            text: "Selecione «Em falta» em cada item para o concluir. Tudo o que já guardou fica preservado.",
          },
    ],
  };
}
