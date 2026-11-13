import { Link } from "@/lib/i18n/navigation";
import type { LegalSection } from "@/components/LegalPage";
import { SITE_DOMAIN } from "@/lib/constants";
import { COMPANY, COMPLAINTS_BOOK_URL, EMAIL } from "@/lib/legal";
import { englishLegalDate } from "@/lib/legal.en";
import { TERMS_UPDATED } from "@/lib/terms";

/**
 * Courtesy translation of the terms and conditions (lib/terms.tsx), for /en/termos.
 *
 * Only the Portuguese text is binding, hashed and archived when someone accepts it; this module
 * is never hashed. When the Portuguese terms change, update this translation to match: same
 * sections, same ids (they are the page's anchors), same numbers and deadlines. It should be
 * reviewed by a lawyer before anyone relies on it.
 */
export const TERMS_TITLE_EN = "Terms and conditions";

/** The version of the Portuguese terms this translates, as an English date. */
export const TERMS_UPDATED_EN = englishLegalDate(TERMS_UPDATED);

export const TERMS_INTRO_EN = (
  <p>
    These terms explain how Ao Lume works and the rules for clients and chefs. In short: Ao Lume connects you with independent chefs; the
    service and the price are agreed with the chef and, once in-app payment is active, the deposit is received by Ao Lume on the chef&apos;s
    behalf.
  </p>
);

export const TERMS_SECTIONS_EN: LegalSection[] = [
  {
    id: "quem-somos",
    title: "Who we are",
    body: (
      <p>
        Ao Lume ({SITE_DOMAIN}) is operated by <strong>{COMPANY.name}</strong>, NIF (Portuguese tax number) {COMPANY.nif}, with registered
        office in {COMPANY.address}. Contact: <a href={`mailto:${EMAIL.contact}`}>{EMAIL.contact}</a>. For help with a request:{" "}
        <a href={`mailto:${EMAIL.support}`}>{EMAIL.support}</a>.
      </p>
    ),
  },
  {
    id: "o-servico",
    title: "What Ao Lume is",
    body: (
      <>
        <p>
          Ao Lume is a platform that connects people with independent chefs and cooks (&ldquo;chefs&rdquo;), for dinners at home, meal
          boxes, cakes, deliveries, collections and events.
        </p>
        <ul>
          <li>Ao Lume does not provide cooking or catering services and is not a party to the contract between the client and the chef.</li>
          <li>
            Chefs are neither employees nor representatives of Ao Lume: they set their own menus, prices, availability and conditions.
          </li>
          <li>
            When in-app payment is active, Ao Lume receives the booking deposit on the chef&apos;s behalf, under the chef&apos;s express
            mandate, and pays it over to the chef less its commission. The remainder of the price of the service is paid directly to the
            chef.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "aceitacao",
    title: "Acceptance and changes",
    body: (
      <>
        <p>
          By using Ao Lume you accept these terms and the <Link href="/privacidade">privacy policy</Link>. We may change them; the version
          in force is the one published on this page, with the date of the last update.
        </p>
        <p>
          Changes that affect chefs are notified by email at least 15 days in advance, in accordance with Regulation (EU) 2019/1150. A chef
          may close their account before the changes take effect.
        </p>
      </>
    ),
  },
  {
    id: "contas",
    title: "Accounts",
    body: (
      <ul>
        <li>Requesting a booking does not require an account. An account is optional for clients and mandatory for chefs.</li>
        <li>To create an account or request a booking you must be at least 18 years old and provide truthful information.</li>
        <li>You are responsible for keeping your password secure and for everything done with your account.</li>
      </ul>
    ),
  },
  {
    id: "reservas",
    title: "Requests and bookings",
    body: (
      <>
        <ul>
          <li>
            The client chooses a menu and an available day and sends the request. Sending a request costs nothing and creates no obligation
            to pay.
          </li>
          <li>The chef has 48 hours to accept, decline or propose another date or price. If there is no reply, the request expires.</li>
          <li>
            When the chef accepts, a contract for the provision of services is formed directly between the client and the chef. The price is
            the one indicated by the chef; the estimates on the site depend on the number of people and on any adjustments agreed between
            the two.
          </li>
          <li>
            The client must state any allergies, intolerances and dietary restrictions. The chef is responsible for the allergen information
            on the dishes (Regulation (EU) No 1169/2011).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "pagamentos",
    title: "Prices and payments",
    body: (
      <>
        <p>
          Until payment of the deposit through the platform is active, the price is agreed and paid directly to the chef, and the rules
          below on the deposit and the commission do not apply. Activation will be announced on this page and notified to chefs by email at
          least 30 days in advance.
        </p>
        <ul>
          <li>
            <strong>Deposit.</strong> Once the chef has accepted the request, the client pays a deposit (<em>sinal</em>) through the
            platform, by MB WAY or by Multibanco reference. The amount of the deposit is set by the chef and shown before payment. The
            booking is only confirmed once the deposit has been received.
          </li>
          <li>
            <strong>On whose behalf we receive it.</strong> Ao Lume receives the deposit in the name and on behalf of the chef, under the
            mandate the chef accepts in the payment intermediation agreement. The deposit money belongs to the chef, not to us, except for
            the part corresponding to the commission.
          </li>
          <li>
            <strong>Remaining amount.</strong> The rest of the price of the service is agreed and paid directly to the chef, by the means
            the chef accepts (MB WAY, bank transfer or cash).
          </li>
          <li>
            <strong>Commission.</strong> Ao Lume charges the chef a commission on the value of the booking, deducted from the deposit. The
            percentage in force is shown in the chef&apos;s dashboard, and changes are notified at least 30 days in advance. For the client,
            using Ao Lume remains free of charge: there is no service fee on the deposit.
          </li>
          <li>
            <strong>Payment to the chef.</strong> Once the service has been completed and the holding period indicated in the dashboard has
            elapsed, we transfer the deposit, less the commission, to the chef, together with a document that identifies the parties and
            itemises the amounts. That document is not an invoice.
          </li>
          <li>
            <strong>Invoices.</strong> The invoice for the service to the client is issued by the chef, who is responsible for their own
            tax obligations. The invoice for the commission is issued by Ao Lume to the chef.
          </li>
          <li>
            <strong>Processing.</strong> Payments are processed by EuPago, a payment institution authorised by the Banco de Portugal. Ao
            Lume does not store card details.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cancelamentos",
    title: "Cancellations",
    body: (
      <>
        <p>
          Each chef sets their own cancellation policy, which is shown on their profile and on the request before it is sent. Cancellation
          is done on the request page, and the chef is notified.
        </p>
        <p>
          <strong>Refund of the deposit.</strong> If the chef cancels after accepting, or does not turn up, the deposit is refunded in full
          and no commission is charged. If it is the client who cancels, the chef&apos;s policy applies. Where payment was made by MB WAY or
          card, the refund is made by the same means; where it was made by Multibanco reference, we ask for the IBAN on the client&apos;s
          booking page. Never by email, message or telephone.
        </p>
        <p>
          Where the chef acts as a professional, the client has the rights that consumer protection law gives them. The 14-day right of
          withdrawal does not apply to catering services with a set date of performance (Decreto-Lei n.º 24/2014, art. 17.º, n.º 1, alínea
          l)).
        </p>
      </>
    ),
  },
  {
    id: "chefs",
    title: "Responsibility and obligations of cooks and chefs",
    body: (
      <>
        <p>
          Each cook or chef works on their own account and is <strong>solely responsible for their activity</strong> and for complying with
          the rules that apply to it. Ao Lume does not verify or guarantee that compliance. In particular, each of them is responsible for:
        </p>
        <ul>
          <li>
            Their tax status and the issuing of invoices or receipts to clients, with a business activity registered with the tax authority
            (Finanças) or, where the law allows, by means of a one-off transaction (<em>ato isolado</em>).
          </li>
          <li>The licences, registrations or notifications required to prepare and sell food, including when cooking at home.</li>
          <li>
            Food hygiene and safety rules (Regulation (EC) No 852/2004 and HACCP) and allergen information (Regulation (EU) No 1169/2011).
          </li>
        </ul>
        <p>
          The information Ao Lume gives about these rules is general and is no substitute for advice from an accountant or the competent
          authorities. Under Lei n.º 36/2023 (DAC7), Ao Lume may have to ask cooks and chefs for tax identification details and report
          information on the activity carried out through the platform to the Portuguese Tax and Customs Authority (Autoridade
          Tributária).
        </p>
        <p>In addition, each cook or chef undertakes to:</p>
        <ul>
          <li>Publish only truthful information and photographs of dishes they have made themselves.</li>
          <li>Reply to requests, honour the bookings they have accepted and respect the cancellation policy they have published.</li>
          <li>Use clients&apos; data only to prepare and provide the booked service.</li>
        </ul>
        <p>We recommend holding civil liability insurance appropriate to the activity.</p>
      </>
    ),
  },
  {
    id: "verificacao",
    title: "Verification and titles",
    body: (
      <>
        <p>
          The team reviews each profile before it goes public: profile photo, photographs of dishes and Instagram or website. Everyone
          appears as a <strong>Cook</strong>. Anyone who sends a cookery training certificate that the team verifies appears as a{" "}
          <strong>Chef</strong>, with the &ldquo;Verified chef&rdquo; badge.
        </p>
        <p>
          Verification confirms these elements and is not a guarantee as to the quality or the lawfulness of any chef&apos;s service.
        </p>
      </>
    ),
  },
  {
    id: "avaliacoes",
    title: "Reviews",
    body: (
      <ul>
        <li>Only someone who has a completed booking with a chef may review that chef, up to 14 days after the service.</li>
        <li>
          Reviews must be honest and relate to the experience. Insults, third parties&apos; personal data and unlawful content are not
          allowed.
        </li>
        <li>The chef may reply publicly to each review.</li>
        <li>We do not remove reviews for being negative. We may hide those that breach these rules, after a report and an assessment.</li>
      </ul>
    ),
  },
  {
    id: "conteudos",
    title: "Content and licence",
    body: (
      <p>
        You keep the rights to what you publish (texts, photographs, reviews). You grant Ao Lume a free, non-exclusive licence to display it
        on the platform and to promote your profile, for as long as it remains published. You warrant that you have the right to publish
        that content.
      </p>
    ),
  },
  {
    id: "proibicoes",
    title: "Prohibited uses",
    body: (
      <ul>
        <li>Publishing false, misleading or unlawful information, or impersonating another person.</li>
        <li>Creating fake bookings or reviews, or paying or receiving anything in exchange for reviews.</li>
        <li>Harassing, discriminating against or threatening other users.</li>
        <li>Collecting data from the site by automated means, or trying to access accounts or systems without authorisation.</li>
      </ul>
    ),
  },
  {
    id: "denuncias",
    title: "Reports and suspension",
    body: (
      <>
        <p>
          You can report unlawful content, or content that breaches these terms, to <a href={`mailto:${EMAIL.legal}`}>{EMAIL.legal}</a>,
          stating the address of the page and the reason. We assess every report and inform the person who made it of the decision.
        </p>
        <p>
          We may hide content, refuse profiles or suspend accounts that breach these terms or the law. We notify the decision and the reason
          to whoever is affected, who may reply to <a href={`mailto:${EMAIL.legal}`}>{EMAIL.legal}</a>.
        </p>
      </>
    ),
  },
  {
    id: "responsabilidade",
    title: "Liability",
    body: (
      <>
        <p>
          Each chef&apos;s service is the responsibility of the chef. Ao Lume is not liable for the performance of the service or for the
          quality or safety of the food. When in-app payment is active, Ao Lume receives only the deposit, on the chef&apos;s behalf; the
          rest is agreed and paid between client and chef.
        </p>
        <p>
          Ao Lume is liable, as provided by law, for damage caused by wilful misconduct or gross negligence in the provision of its own
          service. Nothing in these terms limits the rights that the law guarantees to consumers.
        </p>
      </>
    ),
  },
  {
    id: "litigios",
    title: "Governing law, complaints and disputes",
    body: (
      <>
        <p>These terms are governed by Portuguese law.</p>
        <p>
          <strong>Complaints Book (Livro de Reclamações):</strong> you can submit a complaint in the{" "}
          <a href={COMPLAINTS_BOOK_URL} target="_blank" rel="noopener noreferrer">
            electronic Complaints Book (Livro de Reclamações Eletrónico)
          </a>
          .
        </p>
        <p>
          <strong>Alternative dispute resolution:</strong> in the event of a consumer dispute, the consumer may turn to an alternative
          dispute resolution entity, such as CNIACC, the Centro Nacional de Informação e Arbitragem de Conflitos de Consumo (National Centre
          for Consumer Dispute Information and Arbitration) (
          <a href="https://www.cniacc.pt" target="_blank" rel="noopener noreferrer">
            www.cniacc.pt
          </a>
          ), or the consumer arbitration centre for their area. More information on the{" "}
          <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">
            Portal do Consumidor (Consumer Portal)
          </a>
          .
        </p>
      </>
    ),
  },
];
