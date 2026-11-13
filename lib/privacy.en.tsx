import type { LegalSection } from "@/components/LegalPage";
import { SITE_DOMAIN } from "@/lib/constants";
import { COMPANY, EMAIL } from "@/lib/legal";

/**
 * Courtesy translation of the privacy policy (app/[locale]/privacidade/page.tsx), for
 * /en/privacidade. The Portuguese policy is the binding one. When it changes, update this to
 * match: same sections, same ids (they are the page's anchors), same periods and legal bases. It
 * should be reviewed by a lawyer before anyone relies on it.
 */
export const PRIVACY_TITLE_EN = "Privacy policy";

export const PRIVACY_INTRO_EN = (
  <p>
    We process only the data needed to connect clients with chefs and to make bookings work. In searches, chefs appear by the area where
    they work, never by their address.
  </p>
);

export const PRIVACY_SECTIONS_EN: LegalSection[] = [
  {
    id: "responsavel",
    title: "Data controller",
    body: (
      <p>
        <strong>{COMPANY.name}</strong>, NIF (Portuguese tax number) {COMPANY.nif}, with registered office in {COMPANY.address}, which
        operates Ao Lume ({SITE_DOMAIN}). For any question about your data: <a href={`mailto:${EMAIL.privacy}`}>{EMAIL.privacy}</a>.
      </p>
    ),
  },
  {
    id: "dados",
    title: "What data we process",
    body: (
      <>
        <p>
          <strong>Clients:</strong> name, email, mobile number, address of the service (when it takes place at home or involves delivery),
          day, menu and number of people, notes for the chef, messages in the booking chat and reviews.
        </p>
        <p>
          <strong>Chefs:</strong> account data, public profile (name, area, biography, menus, prices, photographs, Instagram or website),
          availability, travel and delivery settings, and documents sent for verification (for example, certificates).
        </p>
        <p>
          <strong>Payments:</strong> the amount, method and status of each payment, the EuPago reference and, for MB WAY, the mobile number
          used (stored masked). We do not store card details: payment is processed by EuPago.
        </p>
        <p>
          <strong>Chefs&apos; tax and bank details:</strong> legal name, NIF, tax address, VAT regime, IBAN and account holder and, as
          required by law, date and place of birth (sole traders) or commercial registration number (companies). The IBAN is stored
          encrypted and is never shown in full on the platform.
        </p>
        <p>
          <strong>Clients&apos; bank details:</strong> only when we need to refund a payment made by Multibanco reference, which the bank
          does not allow to be reversed. We ask for the IBAN on the booking page, store it encrypted and delete it as soon as the refund has
          been made.
        </p>
        <p>
          <strong>Technical data:</strong> IP address and access logs, needed for the security of the service, and the cookies described
          in <a href="#cookies">Cookies and storage on your device</a>.
        </p>
        <p>
          <strong>Allergies and dietary restrictions:</strong> only if you state them in the notes to your request. They are health data:
          we process them on the basis of your explicit consent, solely so that the chef can prepare the service safely.
        </p>
      </>
    ),
  },
  {
    id: "finalidades",
    title: "What we use the data for and on what legal basis",
    body: (
      <ul>
        <li>
          <strong>Managing requests and bookings</strong>, the conversation with the chef and the emails about the request: performance of
          a contract (Article 6(1)(b) GDPR (RGPD)).
        </li>
        <li>
          <strong>Accounts and chef profiles</strong>, including publishing the profile: performance of a contract.
        </li>
        <li>
          <strong>Receiving the deposit, deducting the commission and paying the chef</strong>, including the payment documents:
          performance of a contract (Article 6(1)(b) GDPR (RGPD)).
        </li>
        <li>
          <strong>Complying with tax and accounting obligations</strong> and reporting annually to the Portuguese Tax and Customs Authority
          (Autoridade Tributária) the chefs&apos; data and amounts required by Decreto-Lei n.º 20/2022 (DAC7): legal obligation (point
          (c)). These data cannot be erased on request while the legal retention period lasts, and we inform each chef of what has been
          reported.
        </li>
        <li>
          <strong>Preventing fraud</strong> in payments, in particular checking changes of IBAN: legitimate interest (point (f)) in not
          allowing a chef&apos;s money to be diverted.
        </li>
        <li>
          <strong>Verifying chefs</strong> (photographs, social media and certificates) and <strong>moderating reviews</strong>: legitimate
          interest in keeping the platform safe and reliable.
        </li>
        <li>
          <strong>Asking for a review</strong> after the service: legitimate interest. You may object at any time.
        </li>
        <li>
          <strong>Security and fraud prevention</strong> (access logs, request limits): legitimate interest.
        </li>
        <li>
          <strong>Measuring our adverts</strong> on Facebook and Instagram, if you accept the cookie notice: consent (Article 6(1)(a)). You
          may withdraw it whenever you wish, under <a href="#cookies">Cookies</a>.
        </li>
        <li>
          <strong>Complying with legal obligations</strong>, such as responding to authorities and, in the case of cooks and chefs,
          reporting to the Portuguese Tax and Customs Authority (Autoridade Tributária) the information required by Lei n.º 36/2023 (DAC7):
          legal obligation (Article 6(1)(c)).
        </li>
      </ul>
    ),
  },
  {
    id: "interessados",
    title: "People interested in cooking on Ao Lume",
    body: (
      <>
        <p>
          If you leave your contact details in a sign-up form (for example, in an advert on Facebook or Instagram), we receive your name,
          telephone number, email, area, what you cook, whether you already sell and, if you provide it, your Instagram or Facebook link.
        </p>
        <p>
          We use these data only to contact you, explain Ao Lume and help you create your profile, because that is what you asked for
          (steps prior to entering into a contract, Article 6(1)(b) GDPR (RGPD)). The advert forms belong to Meta Platforms Ireland, which
          passes the data on to us.
        </p>
        <p>
          If you create a profile, the data are then processed as account data. If you do not go ahead, we delete them within 12 months of
          the last contact, or sooner if you ask us to.
        </p>
      </>
    ),
  },
  {
    id: "partilha",
    title: "Who we share data with",
    body: (
      <>
        <p>
          <strong>With the chef of your booking:</strong> name, contact details, address of the service and notes, to prepare and provide
          the service. The chef processes those data as an independent controller and may only use them for that purpose.
        </p>
        <p>
          <strong>With providers who work for us</strong>, under contract and only on our instructions:
        </p>
        <ul>
          <li>Supabase: database, authentication and file storage.</li>
          <li>Resend: sending emails.</li>
          <li>Komoot (Photon): suggestions of addresses and areas; it receives the text you type in the search.</li>
          <li>OpenFreeMap: maps; it receives your IP address when the map loads.</li>
        </ul>
        <p>
          <strong>With Meta Platforms Ireland</strong>, only if you accept the cookie notice: the pixel tells Meta that you visited the
          site, with your IP address and the cookie identifier, so that we can measure our adverts. For that collection we are joint
          controllers with Meta, which then processes the data as a controller in its own right. Without your permission, the pixel does not
          load and nothing is shared.
        </p>
        <p>We do not sell personal data. We only share it for advertising if you accept the cookie notice.</p>
      </>
    ),
  },
  {
    id: "pagamentos-terceiros",
    title: "Who processes payments",
    body: (
      <p>
        Payments are processed by <strong>EuPago</strong> (Moving Forward Together, S.A.), a payment institution authorised and supervised
        by the Banco de Portugal, which processes the data needed for the transaction as a controller in its own right. Transfers to chefs
        are made by our bank. The Portuguese Tax and Customs Authority (Autoridade Tributária) receives what the law requires us to report.
      </p>
    ),
  },
  {
    id: "transferencias",
    title: "Transfers outside the EEA",
    body: (
      <p>
        Some providers may process data outside the European Economic Area, for example in the United States (as is the case with Meta, if
        you accept the cookie notice). In those cases, the transfer is made with the safeguards provided for in the GDPR (RGPD), such as the
        European Commission&apos;s standard contractual clauses or the EU-US Data Privacy Framework.
      </p>
    ),
  },
  {
    id: "conservacao",
    title: "How long we keep data",
    body: (
      <ul>
        <li>Account and profile: while the account is active; deleted within 30 days of your request to close it.</li>
        <li>Requests, bookings and messages: up to 3 years after the date of the service, to deal with complaints and any disputes.</li>
        <li>Verification selfie: deleted when the profile is approved.</li>
        <li>Verification documents: while the profile is active; deleted within 6 months of closure.</li>
        <li>Reviews: while the chef&apos;s profile is published, without the reviewer&apos;s contact details.</li>
        <li>Access links to requests made without an account: stop working after 90 days.</li>
        <li>
          Payments, payment documents and chefs&apos; tax data: <strong>10 years</strong>, as required by Portuguese tax and accounting law.
          This period prevails over a request for erasure.
        </li>
        <li>A client&apos;s IBAN given for a refund: deleted as soon as the refund has been made.</li>
        <li>Support messages: up to 3 years after they are closed.</li>
        <li>Access logs: up to 12 months.</li>
      </ul>
    ),
  },
  {
    id: "direitos",
    title: "Your rights",
    body: (
      <>
        <p>
          You may request access to your data, its rectification or erasure, restriction of processing and portability, object to
          processing based on legitimate interest and withdraw your consent at any time, without affecting processing already carried out.
        </p>
        <p>
          To exercise these rights, write to <a href={`mailto:${EMAIL.privacy}`}>{EMAIL.privacy}</a>. We reply within one month. You also
          have the right to lodge a complaint with the Comissão Nacional de Proteção de Dados, the Portuguese data protection authority
          (CNPD) (
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
    title: "Cookies and storage on your device",
    body: (
      <>
        <p>For the site to work we use only what is strictly necessary, without asking for consent:</p>
        <ul>
          <li>Session cookies, to keep you signed in.</li>
          <li>One cookie for each request made without an account, to open that request on this device.</li>
          <li>A list of your recent requests, stored only in your browser, so you can find them under &ldquo;Track a request&rdquo;.</li>
        </ul>
        <p>
          With your permission, we also use the Meta Pixel (Facebook and Instagram) to measure whether our adverts work, for example how
          many people create an account after seeing an advert. It is only activated if you click &ldquo;Accept&rdquo; on the cookie notice,
          and you can change your choice at any time under &ldquo;Cookies&rdquo;, at the bottom of every page. Meta processes these data in
          accordance with its own privacy policy.
        </p>
        <ul>
          <li>
            Meta cookies: <strong>_fbp</strong> and, if you arrive from an advert, <strong>_fbc</strong>. They last about three months.
          </li>
          <li>
            Your answer to the notice is stored only in this browser (<strong>aolume-consent</strong>), so that we do not ask again.
          </li>
        </ul>
        <p>We do not use audience analytics cookies.</p>
      </>
    ),
  },
  {
    id: "seguranca",
    title: "Security",
    body: (
      <p>
        Connections are encrypted (HTTPS), access to data is restricted by rules in the database itself (each person only sees what concerns
        them) and verification documents are kept in private storage, accessible only to the chef concerned and the team.
      </p>
    ),
  },
  {
    id: "menores",
    title: "Minors",
    body: <p>Ao Lume is not intended for people under 18, who must not create an account or request bookings.</p>,
  },
  {
    id: "alteracoes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy. The version in force is the one published on this page, with the date of the last update. Significant
        changes are notified by email to account holders.
      </p>
    ),
  },
];
