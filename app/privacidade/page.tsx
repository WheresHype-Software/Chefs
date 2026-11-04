import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { SITE_DOMAIN } from "@/lib/constants";
import { COMPANY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o Ao Lume trata os seus dados pessoais, nos termos do RGPD: que dados, para quê, com quem e os seus direitos.",
  alternates: { canonical: "/privacidade" },
};

const SECTIONS: LegalSection[] = [
  {
    id: "responsavel",
    title: "Responsável pelo tratamento",
    body: (
      <p>
        <strong>{COMPANY.name}</strong>, NIF {COMPANY.nif}, com sede em {COMPANY.address}, que explora o Ao Lume ({SITE_DOMAIN}). Para
        qualquer questão sobre os seus dados: {COMPANY.email}.
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
        <p>Não vendemos dados pessoais nem os partilhamos para publicidade.</p>
      </>
    ),
  },
  {
    id: "transferencias",
    title: "Transferências para fora do EEE",
    body: (
      <p>
        Alguns prestadores podem tratar dados fora do Espaço Económico Europeu, por exemplo nos Estados Unidos. Nesses casos, a
        transferência é feita com as garantias previstas no RGPD, como as cláusulas contratuais-tipo da Comissão Europeia ou o Quadro de
        Privacidade de Dados UE-EUA.
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
          Para exercer estes direitos, escreva para {COMPANY.email}. Respondemos no prazo de um mês. Tem também o direito de apresentar
          reclamação à Comissão Nacional de Proteção de Dados (
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
          exemplo quantas pessoas criam conta depois de ver um anúncio. Só é ativado se carregar em «Aceitar» no aviso de cookies, e
          pode mudar a sua escolha a qualquer momento em «Cookies», no fundo de cada página. A Meta trata estes dados de acordo com a
          sua própria política de privacidade.
        </p>
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

export default function Privacidade() {
  return (
    <LegalPage
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
