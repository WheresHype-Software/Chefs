import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { SITE_DOMAIN } from "@/lib/constants";
import { DEFAULT_LOCALE, routing } from "@/lib/i18n/routing";
import { COMPANY, EMAIL } from "@/lib/legal";
import { LEGAL_UPDATED_EN } from "@/lib/legal.en";
import { PRIVACY_INTRO_EN, PRIVACY_SECTIONS_EN, PRIVACY_TITLE_EN } from "@/lib/privacy.en";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacidade">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "legal.meta.privacy" });
  return { title: t("title"), description: t("description"), alternates: alternates("/privacidade", locale) };
}

const SECTIONS: LegalSection[] = [
  {
    id: "responsavel",
    title: "Responsável pelo tratamento",
    body: (
      <p>
        <strong>{COMPANY.name}</strong>, NIF {COMPANY.nif}, com sede em {COMPANY.address}, que explora o Ao Lume ({SITE_DOMAIN}). Para
        qualquer questão sobre os seus dados: <a href={`mailto:${EMAIL.privacy}`}>{EMAIL.privacy}</a>.
      </p>
    ),
  },
  {
    id: "dados",
    title: "Que dados tratamos",
    body: (
      <>
        <p>
          <strong>Clientes:</strong> nome, email, telemóvel, morada do serviço (quando é em casa ou com entrega), dia, menu e número de
          pessoas, notas para o chef, mensagens no chat da reserva e avaliações.
        </p>
        <p>
          <strong>Chefs:</strong> dados da conta, perfil público (nome, zona, biografia, menus, preços, fotografias, Instagram ou site),
          disponibilidade, definições de deslocação e entregas, e documentos enviados para verificação (por exemplo, certificados).
        </p>
        <p>
          <strong>Pagamentos:</strong> o valor, o método e o estado de cada pagamento, a referência da EuPago e, no caso do MB WAY, o
          telemóvel usado (guardado mascarado). Não guardamos dados de cartão: o pagamento é processado pela EuPago.
        </p>
        <p>
          <strong>Dados fiscais e bancários dos chefs:</strong> nome legal, NIF, morada fiscal, regime de IVA, IBAN e titular da conta e,
          por imposição legal, data e local de nascimento (empresários em nome individual) ou número de registo comercial (sociedades). O
          IBAN é guardado cifrado e nunca é mostrado por inteiro na plataforma.
        </p>
        <p>
          <strong>Dados bancários de clientes:</strong> apenas quando é preciso devolver um pagamento feito por referência Multibanco, que o
          banco não permite reverter. Pedimos o IBAN na página da reserva, guardamo-lo cifrado e apagamo-lo assim que a devolução é feita.
        </p>
        <p>
          <strong>Dados técnicos:</strong> endereço IP e registos de acesso, necessários para a segurança do serviço, e os cookies descritos
          em <a href="#cookies">Cookies e armazenamento no dispositivo</a>.
        </p>
        <p>
          <strong>Alergias e restrições alimentares:</strong> só se as indicar nas notas do pedido. São dados de saúde: tratamo-los com base
          no seu consentimento explícito, apenas para o chef preparar o serviço em segurança.
        </p>
      </>
    ),
  },
  {
    id: "finalidades",
    title: "Para que usamos os dados e com que fundamento",
    body: (
      <ul>
        <li>
          <strong>Gerir pedidos e reservas</strong>, a conversa com o chef e os emails sobre o pedido: execução do contrato (art. 6.º, n.º
          1, alínea b) do RGPD).
        </li>
        <li>
          <strong>Contas e perfis de chef</strong>, incluindo a publicação do perfil: execução do contrato.
        </li>
        <li>
          <strong>Receber o sinal, descontar a comissão e pagar ao chef</strong>, incluindo os documentos de pagamento: execução do contrato
          (art. 6.º, n.º 1, alínea b) do RGPD).
        </li>
        <li>
          <strong>Cumprir obrigações fiscais e contabilísticas</strong> e comunicar anualmente à Autoridade Tributária os dados e os
          montantes dos chefs exigidos pelo Decreto-Lei n.º 20/2022 (DAC7): obrigação legal (alínea c). Estes dados não podem ser apagados a
          pedido enquanto durar o prazo legal, e informamos cada chef do que foi comunicado.
        </li>
        <li>
          <strong>Prevenir fraude</strong> nos pagamentos, nomeadamente verificar alterações de IBAN: interesse legítimo (alínea f) em não
          deixar que o dinheiro de um chef seja desviado.
        </li>
        <li>
          <strong>Verificar chefs</strong> (fotografias, redes sociais e certificados) e <strong>moderar avaliações</strong>: interesse
          legítimo em manter uma plataforma segura e fiável.
        </li>
        <li>
          <strong>Pedir uma avaliação</strong> depois do serviço: interesse legítimo. Pode opor-se a qualquer momento.
        </li>
        <li>
          <strong>Segurança e prevenção de fraude</strong> (registos de acesso, limites de pedidos): interesse legítimo.
        </li>
        <li>
          <strong>Medir os nossos anúncios</strong> no Facebook e no Instagram, se aceitar o aviso de cookies: consentimento (art. 6.º, n.º
          1, alínea a)). Pode retirá-lo quando quiser, em <a href="#cookies">Cookies</a>.
        </li>
        <li>
          <strong>Cumprir obrigações legais</strong>, como responder a autoridades e, no caso dos cozinheiros e chefs, comunicar à
          Autoridade Tributária a informação exigida pela Lei n.º 36/2023 (DAC7): obrigação legal (art. 6.º, n.º 1, alínea c)).
        </li>
      </ul>
    ),
  },
  {
    id: "interessados",
    title: "Pessoas interessadas em cozinhar no Ao Lume",
    body: (
      <>
        <p>
          Se deixar o seu contacto num formulário de inscrição (por exemplo, num anúncio no Facebook ou Instagram), recebemos o nome,
          telefone, email, a zona, o que cozinha, se já vende e, se o indicar, o link do Instagram ou Facebook.
        </p>
        <p>
          Usamos estes dados apenas para o contactar, explicar o Ao Lume e ajudar a criar o seu perfil, porque foi isso que pediu
          (diligências pré-contratuais, art. 6.º, n.º 1, alínea b) do RGPD). Os formulários dos anúncios são da Meta Platforms Ireland, que
          nos entrega os dados.
        </p>
        <p>
          Se criar perfil, os dados passam a ser tratados como dados de conta. Se não avançar, apagamo-los até 12 meses depois do último
          contacto, ou antes, se nos pedir.
        </p>
      </>
    ),
  },
  {
    id: "partilha",
    title: "Com quem partilhamos",
    body: (
      <>
        <p>
          <strong>Com o chef da sua reserva:</strong> nome, contactos, morada do serviço e notas, para preparar e prestar o serviço. O chef
          trata esses dados como responsável independente e só os pode usar para esse fim.
        </p>
        <p>
          <strong>Com prestadores que trabalham para nós</strong>, com contrato e apenas segundo as nossas instruções:
        </p>
        <ul>
          <li>Supabase: base de dados, autenticação e armazenamento de ficheiros.</li>
          <li>Resend: envio de emails.</li>
          <li>Komoot (Photon): sugestões de moradas e zonas; recebe o texto que escreve na pesquisa.</li>
          <li>OpenFreeMap: mapas; recebe o seu endereço IP ao carregar o mapa.</li>
        </ul>
        <p>
          <strong>Com a Meta Platforms Ireland</strong>, apenas se aceitar o aviso de cookies: o pixel comunica-lhe que visitou o site, com
          o endereço IP e o identificador do cookie, para medirmos os nossos anúncios. Nessa recolha somos responsáveis conjuntos com a
          Meta, que depois trata os dados como responsável própria. Sem a sua autorização, o pixel não chega a carregar e nada é comunicado.
        </p>
        <p>Não vendemos dados pessoais. Só os partilhamos para publicidade se aceitar o aviso de cookies.</p>
      </>
    ),
  },
  {
    id: "pagamentos-terceiros",
    title: "Quem processa os pagamentos",
    body: (
      <p>
        Os pagamentos são processados pela <strong>EuPago</strong> (Moving Forward Together, S.A.), instituição de pagamento autorizada e
        supervisionada pelo Banco de Portugal, que trata os dados necessários à operação como responsável pelo seu próprio tratamento. As
        transferências para os chefs são feitas pelo nosso banco. A Autoridade Tributária recebe o que a lei nos obriga a comunicar.
      </p>
    ),
  },
  {
    id: "transferencias",
    title: "Transferências para fora do EEE",
    body: (
      <p>
        Alguns prestadores podem tratar dados fora do Espaço Económico Europeu, por exemplo nos Estados Unidos (é o caso da Meta, se aceitar
        o aviso de cookies). Nesses casos, a transferência é feita com as garantias previstas no RGPD, como as cláusulas contratuais-tipo da
        Comissão Europeia ou o Quadro de Privacidade de Dados UE-EUA.
      </p>
    ),
  },
  {
    id: "conservacao",
    title: "Durante quanto tempo",
    body: (
      <ul>
        <li>Conta e perfil: enquanto a conta estiver ativa; apagados até 30 dias depois de pedir o encerramento.</li>
        <li>Pedidos, reservas e mensagens: até 3 anos depois da data do serviço, para tratar reclamações e eventuais litígios.</li>
        <li>Selfie de verificação: apagada quando o perfil é aprovado.</li>
        <li>Documentos de verificação: enquanto o perfil estiver ativo; apagados até 6 meses depois do encerramento.</li>
        <li>Avaliações: enquanto o perfil do chef estiver publicado, sem os contactos de quem avaliou.</li>
        <li>Links de acesso a pedidos sem conta: deixam de funcionar ao fim de 90 dias.</li>
        <li>
          Pagamentos, documentos de pagamento e dados fiscais dos chefs: <strong>10 anos</strong>, como exige a lei fiscal e contabilística
          portuguesa. Este prazo prevalece sobre um pedido de apagamento.
        </li>
        <li>IBAN de cliente dado para uma devolução: apagado assim que a devolução é feita.</li>
        <li>Mensagens de apoio: até 3 anos depois de fechadas.</li>
        <li>Registos de acesso: até 12 meses.</li>
      </ul>
    ),
  },
  {
    id: "direitos",
    title: "Os seus direitos",
    body: (
      <>
        <p>
          Pode pedir acesso aos seus dados, a sua retificação ou apagamento, a limitação do tratamento, a portabilidade, opor-se ao
          tratamento baseado em interesse legítimo e retirar o consentimento a qualquer momento, sem afetar o tratamento já feito.
        </p>
        <p>
          Para exercer estes direitos, escreva para <a href={`mailto:${EMAIL.privacy}`}>{EMAIL.privacy}</a>. Respondemos no prazo de um mês.
          Tem também o direito de apresentar reclamação à Comissão Nacional de Proteção de Dados (
          <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">
            www.cnpd.pt
          </a>
          ).
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies e armazenamento no dispositivo",
    body: (
      <>
        <p>Para o site funcionar usamos apenas o estritamente necessário, sem pedir consentimento:</p>
        <ul>
          <li>Cookies de sessão, para manter a sessão iniciada.</li>
          <li>Um cookie por pedido feito sem conta, para abrir esse pedido neste dispositivo.</li>
          <li>Uma lista dos seus pedidos recentes, guardada só no seu navegador, para os encontrar em «Acompanhar pedido».</li>
        </ul>
        <p>
          Com a sua autorização, usamos também o Pixel da Meta (Facebook e Instagram) para medir se os nossos anúncios funcionam, por
          exemplo quantas pessoas criam conta depois de ver um anúncio. Só é ativado se carregar em «Aceitar» no aviso de cookies, e pode
          mudar a sua escolha a qualquer momento em «Cookies», no fundo de cada página. A Meta trata estes dados de acordo com a sua própria
          política de privacidade.
        </p>
        <ul>
          <li>
            Cookies da Meta: <strong>_fbp</strong> e, se vier de um anúncio, <strong>_fbc</strong>. Duram cerca de três meses.
          </li>
          <li>
            A sua resposta ao aviso fica guardada só neste navegador (<strong>aolume-consent</strong>), para não voltarmos a perguntar.
          </li>
        </ul>
        <p>Não usamos cookies de análise de audiências.</p>
      </>
    ),
  },
  {
    id: "seguranca",
    title: "Segurança",
    body: (
      <p>
        As ligações são cifradas (HTTPS), o acesso aos dados é limitado por regras na própria base de dados (cada pessoa só vê o que lhe diz
        respeito) e os documentos de verificação ficam num armazenamento privado, a que só o próprio chef e a equipa têm acesso.
      </p>
    ),
  },
  {
    id: "menores",
    title: "Menores",
    body: <p>O Ao Lume não se destina a menores de 18 anos, que não devem criar conta nem pedir reservas.</p>,
  },
  {
    id: "alteracoes",
    title: "Alterações a esta política",
    body: (
      <p>
        Podemos atualizar esta política. A versão em vigor é a publicada nesta página, com a data da última atualização. Alterações
        importantes são comunicadas por email a quem tem conta.
      </p>
    ),
  },
];

/**
 * The Portuguese policy below is the binding one; the English page shows a courtesy translation
 * (lib/privacy.en.tsx) under a notice saying so.
 */
export default async function Privacidade({ params }: PageProps<"/[locale]/privacidade">) {
  const { locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  if (locale !== DEFAULT_LOCALE) {
    return <LegalPage path="/privacidade" title={PRIVACY_TITLE_EN} updated={LEGAL_UPDATED_EN} intro={PRIVACY_INTRO_EN} sections={PRIVACY_SECTIONS_EN} />;
  }
  return (
    <LegalPage
      path="/privacidade"
      title="Política de privacidade"
      intro={
        <p>
          Tratamos apenas os dados necessários para ligar clientes a chefs e para as reservas funcionarem. Nas pesquisas, os chefs aparecem
          pela zona onde trabalham, nunca pela morada.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
