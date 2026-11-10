import Link from "next/link";
import { Fragment, isValidElement, type ReactNode } from "react";
import type { LegalSection } from "@/components/LegalPage";
import { SITE_DOMAIN } from "@/lib/constants";
import { COMPANY, COMPLAINTS_BOOK_URL, EMAIL } from "@/lib/legal";

/**
 * The terms and conditions, as data, so that the page and the archive say exactly the same thing.
 *
 * Whoever accepts the terms accepts these words: termsText() turns them into plain text, which is
 * hashed and stored whole when someone accepts it. Change a word here and bump TERMS_UPDATED.
 */
export const TERMS_TITLE = "Termos e condições";

/** The terms' version, shown on the page and recorded with every acceptance. */
export const TERMS_UPDATED = "10 de novembro de 2026";

export const TERMS_INTRO = (
  <p>
    Estes termos explicam como funciona o Ao Lume e as regras para clientes e chefs. Em resumo: o Ao Lume liga-o a chefs independentes; o
    serviço e o preço são combinados com o chef e, quando o pagamento na app estiver ativo, o sinal é recebido pelo Ao Lume em nome do chef.
  </p>
);

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "quem-somos",
    title: "Quem somos",
    body: (
      <p>
        O Ao Lume ({SITE_DOMAIN}) é explorado pela <strong>{COMPANY.name}</strong>, NIF {COMPANY.nif}, com sede em {COMPANY.address}.
        Contacto: <a href={`mailto:${EMAIL.contact}`}>{EMAIL.contact}</a>. Para ajuda com um pedido:{" "}
        <a href={`mailto:${EMAIL.support}`}>{EMAIL.support}</a>.
      </p>
    ),
  },
  {
    id: "o-servico",
    title: "O que é o Ao Lume",
    body: (
      <>
        <p>
          O Ao Lume é uma plataforma que liga pessoas a chefs e cozinheiros independentes («chefs»), para jantares em casa, marmitas, bolos,
          entregas, levantamentos e eventos.
        </p>
        <ul>
          <li>O Ao Lume não presta serviços de cozinha ou restauração e não é parte no contrato entre o cliente e o chef.</li>
          <li>Os chefs não são trabalhadores nem representantes do Ao Lume: definem os seus menus, preços, disponibilidade e condições.</li>
          <li>
            Quando o pagamento na app está ativo, o Ao Lume recebe o sinal da reserva em nome do chef, com mandato expresso dele, e
            entrega-lho deduzida a sua comissão. O restante valor do serviço é pago diretamente ao chef.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "aceitacao",
    title: "Aceitação e alterações",
    body: (
      <>
        <p>
          Ao utilizar o Ao Lume aceita estes termos e a <Link href="/privacidade">política de privacidade</Link>. Podemos alterá-los; a
          versão em vigor é a publicada nesta página, com a data da última atualização.
        </p>
        <p>
          Alterações que afetem os chefs são comunicadas por email com pelo menos 15 dias de antecedência, nos termos do Regulamento (UE)
          2019/1150. O chef pode encerrar a conta antes de as alterações entrarem em vigor.
        </p>
      </>
    ),
  },
  {
    id: "contas",
    title: "Contas",
    body: (
      <ul>
        <li>Pedir uma reserva não exige conta. A conta é opcional para clientes e obrigatória para chefs.</li>
        <li>Para criar conta ou pedir uma reserva tem de ter pelo menos 18 anos e dar informação verdadeira.</li>
        <li>É responsável por manter a palavra-passe segura e pelo que for feito com a sua conta.</li>
      </ul>
    ),
  },
  {
    id: "reservas",
    title: "Pedidos e reservas",
    body: (
      <>
        <ul>
          <li>O cliente escolhe um menu, um dia livre e envia o pedido. Enviar um pedido não custa nada nem obriga a pagar.</li>
          <li>O chef tem 48 horas para aceitar, recusar ou propor outra data ou preço. Sem resposta, o pedido expira.</li>
          <li>
            Quando o chef aceita, forma-se um contrato de prestação de serviço diretamente entre o cliente e o chef. O preço é o indicado
            pelo chef; as estimativas no site dependem do número de pessoas e de eventuais ajustes combinados entre ambos.
          </li>
          <li>
            O cliente deve indicar alergias, intolerâncias e restrições alimentares. O chef é responsável pela informação sobre alergénios
            dos pratos (Regulamento (UE) n.º 1169/2011).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "pagamentos",
    title: "Preços e pagamentos",
    body: (
      <>
        <p>
          Enquanto o pagamento do sinal através da plataforma não estiver ativo, o preço é combinado e pago diretamente ao chef, e as regras
          abaixo sobre o sinal e a comissão não se aplicam. A ativação é anunciada nesta página e comunicada aos chefs por email com pelo
          menos 30 dias de antecedência.
        </p>
        <ul>
          <li>
            <strong>Sinal.</strong> Depois de o chef aceitar o pedido, o cliente paga um sinal através da plataforma, por MB WAY ou por
            referência Multibanco. O valor do sinal é definido pelo chef e mostrado antes do pagamento. A reserva só fica confirmada quando
            o sinal entra.
          </li>
          <li>
            <strong>Em nome de quem recebemos.</strong> O Ao Lume recebe o sinal em nome e por conta do chef, ao abrigo do mandato que este
            aceita no contrato de intermediação de pagamentos. O dinheiro do sinal é do chef, não nosso, exceto a parte correspondente à
            comissão.
          </li>
          <li>
            <strong>Restante valor.</strong> O resto do preço do serviço é combinado e pago diretamente ao chef, pelos meios que ele aceita
            (MB WAY, transferência ou numerário).
          </li>
          <li>
            <strong>Comissão.</strong> O Ao Lume cobra ao chef uma comissão sobre o valor da reserva, deduzida ao sinal. A percentagem em
            vigor está no painel do chef e alterações são comunicadas com pelo menos 30 dias de antecedência. Para o cliente, usar o Ao Lume
            continua a não ter custo: não há taxa de serviço sobre o sinal.
          </li>
          <li>
            <strong>Pagamento ao chef.</strong> Concluído o serviço e decorrido o prazo de retenção indicado no painel, transferimos ao chef
            o sinal deduzido da comissão, com um documento que identifica as partes e discrimina os valores. Esse documento não é uma
            fatura.
          </li>
          <li>
            <strong>Faturas.</strong> A fatura do serviço ao cliente é emitida pelo chef, responsável pelas suas obrigações fiscais. A
            fatura da comissão é emitida pelo Ao Lume ao chef.
          </li>
          <li>
            <strong>Processamento.</strong> Os pagamentos são processados pela EuPago, instituição de pagamento autorizada pelo Banco de
            Portugal. O Ao Lume não guarda dados de cartão.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cancelamentos",
    title: "Cancelamentos",
    body: (
      <>
        <p>
          Cada chef define a sua política de cancelamento, que aparece no perfil e no pedido antes de o enviar. O cancelamento é feito na
          página do pedido e o chef é avisado.
        </p>
        <p>
          <strong>Devolução do sinal.</strong> Se o chef cancelar depois de aceitar, ou não comparecer, o sinal é devolvido por inteiro e a
          comissão não é cobrada. Se for o cliente a cancelar, aplica-se a política do chef. Quando o pagamento foi feito por MB WAY ou
          cartão, a devolução segue pelo mesmo meio; quando foi por referência Multibanco, pedimos o IBAN na página da reserva do cliente.
          Nunca por email, mensagem ou telefone.
        </p>
        <p>
          Quando o chef atua como profissional, o cliente tem os direitos que a lei de defesa do consumidor lhe dá. O direito de livre
          resolução de 14 dias não se aplica a serviços de restauração com data de execução marcada (Decreto-Lei n.º 24/2014, art. 17.º, n.º
          1, alínea l)).
        </p>
      </>
    ),
  },
  {
    id: "chefs",
    title: "Responsabilidade e obrigações dos cozinheiros e chefs",
    body: (
      <>
        <p>
          Cada cozinheiro ou chef trabalha por conta própria e é <strong>o único responsável pela sua atividade</strong> e pelo cumprimento
          das regras que se lhe aplicam. O Ao Lume não verifica nem garante esse cumprimento. Em especial, cabe a cada um:
        </p>
        <ul>
          <li>
            O seu enquadramento fiscal e a emissão de faturas ou recibos aos clientes, com atividade aberta nas Finanças ou, quando a lei o
            permita, através de ato isolado.
          </li>
          <li>As licenças, registos ou comunicações exigidos para preparar e vender alimentos, incluindo quando cozinha em casa.</li>
          <li>
            As regras de higiene e segurança alimentar (Regulamento (CE) n.º 852/2004 e HACCP) e a informação sobre alergénios (Regulamento
            (UE) n.º 1169/2011).
          </li>
        </ul>
        <p>
          A informação que o Ao Lume dá sobre estas regras é geral e não substitui o aconselhamento de um contabilista ou das entidades
          competentes. Nos termos da Lei n.º 36/2023 (DAC7), o Ao Lume pode ter de pedir dados de identificação fiscal aos cozinheiros e
          chefs e comunicar à Autoridade Tributária informação sobre a atividade feita através da plataforma.
        </p>
        <p>Além disso, cada cozinheiro ou chef compromete-se a:</p>
        <ul>
          <li>Publicar apenas informação verdadeira e fotografias de pratos feitos por si.</li>
          <li>Responder aos pedidos, cumprir as reservas aceites e respeitar a política de cancelamento que publicou.</li>
          <li>Usar os dados dos clientes apenas para preparar e prestar o serviço reservado.</li>
        </ul>
        <p>Recomendamos ter seguro de responsabilidade civil adequado à atividade.</p>
      </>
    ),
  },
  {
    id: "verificacao",
    title: "Verificação e títulos",
    body: (
      <>
        <p>
          A equipa revê cada perfil antes de ficar público: fotografia de perfil, fotografias de pratos e Instagram ou site. Todos aparecem
          como <strong>Cozinheiro</strong>. Quem envia um certificado de formação em cozinha que a equipa verifique passa a aparecer como{" "}
          <strong>Chef</strong>, com a marca «Chef verificado».
        </p>
        <p>A verificação confirma estes elementos e não é uma garantia sobre a qualidade ou a legalidade do serviço de cada chef.</p>
      </>
    ),
  },
  {
    id: "avaliacoes",
    title: "Avaliações",
    body: (
      <ul>
        <li>Só pode avaliar um chef quem tem uma reserva concluída com esse chef, até 14 dias depois do serviço.</li>
        <li>
          As avaliações devem ser honestas e relativas à experiência. Não são permitidos insultos, dados pessoais de terceiros ou conteúdo
          ilegal.
        </li>
        <li>O chef pode responder publicamente a cada avaliação.</li>
        <li>Não removemos avaliações por serem negativas. Podemos ocultar as que violem estas regras, após denúncia e análise.</li>
      </ul>
    ),
  },
  {
    id: "conteudos",
    title: "Conteúdos e licença",
    body: (
      <p>
        Mantém os direitos sobre o que publica (textos, fotografias, avaliações). Concede ao Ao Lume uma licença gratuita e não exclusiva
        para os mostrar na plataforma e para promover o seu perfil, enquanto estiverem publicados. Garante que tem o direito de publicar
        esses conteúdos.
      </p>
    ),
  },
  {
    id: "proibicoes",
    title: "Utilizações proibidas",
    body: (
      <ul>
        <li>Publicar informação falsa, enganosa ou ilegal, ou fazer-se passar por outra pessoa.</li>
        <li>Criar reservas ou avaliações falsas, ou pagar ou receber algo em troca de avaliações.</li>
        <li>Assediar, discriminar ou ameaçar outros utilizadores.</li>
        <li>Recolher dados do site de forma automatizada ou tentar aceder a contas ou sistemas sem autorização.</li>
      </ul>
    ),
  },
  {
    id: "denuncias",
    title: "Denúncias e suspensão",
    body: (
      <>
        <p>
          Pode denunciar conteúdos ilegais ou que violem estes termos para <a href={`mailto:${EMAIL.legal}`}>{EMAIL.legal}</a>, indicando o
          endereço da página e o motivo. Analisamos cada denúncia e informamos quem a fez da decisão.
        </p>
        <p>
          Podemos ocultar conteúdos, recusar perfis ou suspender contas que violem estes termos ou a lei. Comunicamos a decisão e o motivo a
          quem for afetado, que pode responder para <a href={`mailto:${EMAIL.legal}`}>{EMAIL.legal}</a>.
        </p>
      </>
    ),
  },
  {
    id: "responsabilidade",
    title: "Responsabilidade",
    body: (
      <>
        <p>
          O serviço de cada chef é da responsabilidade do chef. O Ao Lume não responde pela execução do serviço nem pela qualidade ou
          segurança dos alimentos. Quando o pagamento na app está ativo, o Ao Lume recebe apenas o sinal, em nome do chef; o restante é
          combinado e pago entre cliente e chef.
        </p>
        <p>
          O Ao Lume responde, nos termos da lei, pelos danos causados com dolo ou negligência grave na prestação do seu próprio serviço.
          Nada nestes termos limita os direitos que a lei garante aos consumidores.
        </p>
      </>
    ),
  },
  {
    id: "litigios",
    title: "Lei aplicável, reclamações e litígios",
    body: (
      <>
        <p>Estes termos regem-se pela lei portuguesa.</p>
        <p>
          <strong>Livro de Reclamações:</strong> pode apresentar uma reclamação no{" "}
          <a href={COMPLAINTS_BOOK_URL} target="_blank" rel="noopener noreferrer">
            Livro de Reclamações Eletrónico
          </a>
          .
        </p>
        <p>
          <strong>Resolução alternativa de litígios:</strong> em caso de litígio de consumo, o consumidor pode recorrer a uma entidade de
          resolução alternativa de litígios, como o CNIACC, Centro Nacional de Informação e Arbitragem de Conflitos de Consumo (
          <a href="https://www.cniacc.pt" target="_blank" rel="noopener noreferrer">
            www.cniacc.pt
          </a>
          ), ou o centro de arbitragem de consumo da sua área. Mais informação no{" "}
          <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">
            Portal do Consumidor
          </a>
          .
        </p>
      </>
    ),
  },
];

/*
 * Plain text, for the hash and the archive. Paragraphs and list items become lines; a link keeps
 * its address next to its words, so the archived copy loses nothing a reader could have followed.
 */
type WithChildren = { children?: ReactNode; href?: string };

function inline(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(inline).join("");
  if (isValidElement<WithChildren>(node)) {
    const text = inline(node.props.children);
    const href = node.props.href;
    if (!href) return text;
    const target = href.replace(/^mailto:/, "");
    return text.trim() === target ? text : `${text} (${target})`;
  }
  return "";
}

const tidy = (s: string) => s.replace(/\s+/g, " ").trim();

function blocks(node: ReactNode): string[] {
  if (Array.isArray(node)) return node.flatMap(blocks);
  if (isValidElement<WithChildren>(node)) {
    if (node.type === Fragment) return blocks(node.props.children);
    if (node.type === "ul") return [blocks(node.props.children).join("\n")];
    if (node.type === "li") return [`- ${tidy(inline(node.props.children))}`];
  }
  const text = tidy(inline(node));
  return text ? [text] : [];
}

/** The terms exactly as accepted: what gets hashed and archived. */
export function termsText(): string {
  const sections = TERMS_SECTIONS.map((s, i) => `${i + 1}. ${s.title}\n${blocks(s.body).join("\n\n")}`);
  return [`${TERMS_TITLE}, versão de ${TERMS_UPDATED}`, ...blocks(TERMS_INTRO), ...sections].join("\n\n");
}
