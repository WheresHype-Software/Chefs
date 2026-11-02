import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { SITE_DOMAIN } from "@/lib/constants";
import { COMPANY, COMPLAINTS_BOOK_URL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos e condições",
  description: "Termos e condições de utilização do Ao Lume, para clientes e para chefs.",
  alternates: { canonical: "/termos" },
};

const SECTIONS: LegalSection[] = [
  {
    id: "quem-somos",
    title: "Quem somos",
    body: (
      <p>
        O Ao Lume ({SITE_DOMAIN}) é explorado pela <strong>{COMPANY.name}</strong>, NIF {COMPANY.nif}, com sede em {COMPANY.address}.
        Contacto: {COMPANY.email}.
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
          <li>O Ao Lume não recebe nem processa pagamentos: o cliente paga diretamente ao chef.</li>
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
      <ul>
        <li>
          O cliente paga ao chef, pelos meios que o chef aceita (MB WAY, transferência ou numerário). O chef pode pedir um sinal para
          confirmar a data.
        </li>
        <li>Recibos e faturas são emitidos pelo chef, que é responsável pelas suas obrigações fiscais.</li>
        <li>Usar o Ao Lume é gratuito para clientes.</li>
        <li>
          Para chefs, o Ao Lume é gratuito no lançamento. Planos pagos ou comissões, se vierem a existir, só se aplicam depois de
          comunicados com pelo menos 15 dias de antecedência.
        </li>
      </ul>
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
          Pode denunciar conteúdos ilegais ou que violem estes termos para {COMPANY.email}, indicando o endereço da página e o motivo.
          Analisamos cada denúncia e informamos quem a fez da decisão.
        </p>
        <p>
          Podemos ocultar conteúdos, recusar perfis ou suspender contas que violem estes termos ou a lei. Comunicamos a decisão e o motivo a
          quem for afetado, que pode responder para {COMPANY.email}.
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
          O serviço de cada chef é da responsabilidade do chef. O Ao Lume não responde pela execução do serviço, pela qualidade ou segurança
          dos alimentos, nem por acordos e pagamentos entre cliente e chef.
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

export default function Termos() {
  return (
    <LegalPage
      title="Termos e condições"
      intro={
        <p>
          Estes termos explicam como funciona o Ao Lume e as regras para clientes e chefs. Em resumo: o Ao Lume liga-o a chefs
          independentes; o serviço, o preço e o pagamento são combinados diretamente com o chef.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
