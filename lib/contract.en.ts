import { CONTRACT_VERSION } from "./contract";
import { COMPANY, EMAIL } from "./legal";

/**
 * Courtesy translation of the chef agreement (lib/contract.ts), for /en/contrato-chefs.
 *
 * What a chef accepts, and what is hashed and archived, is always the Portuguese contractText():
 * this text is never hashed and carries no legal weight of its own. It translates the version in
 * CONTRACT_VERSION; when the Portuguese text changes, update this to match clause by clause, with
 * the same numbers and deadlines. It should be reviewed by a lawyer before anyone relies on it.
 */
export const CONTRACT_TITLE_EN = "Payment intermediation agreement";

/** The English heading of clause 12 (FORM_CLAUSE_TITLE). */
export const FORM_CLAUSE_TITLE_EN = "Form and evidence";

export function contractTextEn(): string {
  return `${CONTRACT_TITLE_EN}, version ${CONTRACT_VERSION}

Between ${COMPANY.name}, NIF ${COMPANY.nif}, with registered office in ${COMPANY.address}, which operates the Ao Lume
platform (hereinafter "Ao Lume"), and the professional who accepts this agreement in their account (hereinafter "the chef").

1. Purpose
Ao Lume connects clients with chefs and cooks. The catering service is provided by the chef to the client;
Ao Lume does not cook, does not engage the chef and is not a party to the contract for the provision of services.

2. Scope and commencement
Clauses 3 to 8 apply only to bookings whose deposit is paid through the platform, and only from the time
that feature is active. Until then, Ao Lume does not receive payments on the chef's behalf or charge commission,
and the price of the service is agreed and paid directly between the client and the chef. Activation is notified
to the chef by email at least 30 days in advance, stating the commission rate in force. The remaining clauses
apply from acceptance.

3. Mandate to receive the deposit
The chef expressly authorises Ao Lume to receive, in the chef's name and on the chef's behalf, the deposit paid by
the client through the platform. Ao Lume acts as the chef's agent (mandatário) for that purpose and for that purpose only.
The remainder of the price of the service is agreed and paid directly between the client and the chef, outside the platform.

4. Commission
Ao Lume charges a commission on the total value of the booking, at the rate in force published in the chef's dashboard
at the time the chef accepts each request. The chef authorises Ao Lume to deduct that commission from the deposit
received. The amount of the commission is fixed at the time the chef accepts the request and is not changed
afterwards, even if the rate changes in the meantime.

5. Payment to the chef
Once the service has been completed, Ao Lume transfers to the chef the deposit received less the commission, to the IBAN
registered in the chef's account. There is a holding period between completion of the service and payment,
so that any complaints from the client arrive before the money is paid out. Payments are made
periodically; the chef can see at any time, in their dashboard, how much they are due to receive and the status
of each amount.

6. Payment document
With each payment, Ao Lume issues and sends the chef a document identifying the chef (legal name, NIF and
tax address), the booking, the value of the service, the deposit received, the commission deducted and the amount
transferred. The chef declares that they know and accept the content of these documents under this agreement,
waiving signature document by document, and undertakes to notify Ao Lume of any error within 15 days.
This document is not an invoice and does not relieve the chef of their tax obligations towards the client or of
the issue of an invoice by the chef where due.

7. Tax obligations of the chef
The chef declares that they have a business activity registered with the Autoridade Tributária (Portuguese Tax and
Customs Authority), that they keep their tax details up to date in the dashboard and that they comply with their
invoicing and VAT obligations. Ao Lume's commission is invoiced to the chef in accordance with the law.

8. Cancellations and refunds
The rules on cancellation and on refund of the deposit are those published on the platform and those set by the
chef in their cancellation policy. Where the deposit is refunded to the client for reasons not attributable to the
chef, the corresponding commission is not charged. Where it is the chef who cancels after accepting, the deposit is
refunded to the client in full.

9. Personal data
The chef's tax and bank details are processed for the performance of this agreement and to comply with legal
obligations, kept for the legal period of ten years, and are not used for any other purpose. Ao Lume is required
to report annually to the Autoridade Tributária the data and amounts provided for in Decreto-Lei n.º 20/2022 (DAC7),
and informs the chef of what has been reported. The chef may exercise their rights at ${EMAIL.privacy}.

10. Amendments and term
This agreement is valid for an indefinite period. Changes to the commission rate or to this text are notified
at least 30 days in advance and require fresh acceptance; until then the conditions already accepted apply. The
chef may terminate the agreement at any time, and Ao Lume remains obliged to pay whatever it has already received
on the chef's behalf.

11. Liability of the chef
The chef provides the service on their own account and is solely responsible for the preparation, storage, transport
and serving of the food, for compliance with food hygiene and safety rules (Regulation (EC) No 852/2004 and HACCP
principles), for the allergen information given to the client (Regulation (EU) No 1169/2011) and for the licences,
registrations and insurance required for their activity. The chef undertakes to indemnify Ao Lume for claims, fines
or damage arising from the service they provide, except where caused by an act or omission attributable to Ao Lume.
Nothing in this clause limits the liability of either party in cases where the law does not permit it.

12. ${FORM_CLAUSE_TITLE_EN}
The parties agree that this agreement is concluded electronically and that the chef's acceptance in their account,
recorded with the date, time and session data, constitutes the chef's signature, in place of a handwritten signature,
and is evidence of the conclusion and content of the agreement accepted. Ao Lume keeps the accepted text and sends
the chef, by email, a note of the version accepted with a link to the full text, which the chef can save and print.

13. Governing law
Portuguese law applies. The courts of the judicial district (comarca) of Lisbon have jurisdiction over any dispute,
without prejudice to recourse to alternative dispute resolution and to the Livro de Reclamações (Complaints Book).

Contact: ${EMAIL.support}`;
}

/** CONTRACT_HIGHLIGHTS, in English, for the summary box above the text. */
export const CONTRACT_HIGHLIGHTS_EN = [
  "You authorise Ao Lume to receive the client's deposit on your behalf.",
  "The commission is deducted from the deposit; the rest is transferred to you after the service.",
  "Each payment comes with a document showing your tax details, which is accepted under this agreement.",
  "If you cancel after accepting a request, the deposit goes back to the client in full.",
  "You alone are responsible for the food safety, the allergens and the licences of your service.",
  "Your tax details are reported to the Autoridade Tributária once a year (DAC7).",
] as const;
