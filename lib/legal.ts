// Who runs Ao Lume, for the legal pages and the footer (DL 7/2004, art. 10.º: identification of
// the service provider).
export const COMPANY = {
  name: "Where's Hype Software",
  nif: "516834797",
  address: "Vila Franca de Xira, Lisboa",
  email: "ola@aolume.com",
} as const;

/**
 * The addresses on the aolume.com catch-all. One inbox per job: whoever reads the mail knows what
 * it is about before opening it, and a page can show the address that fits what is being asked.
 */
export const EMAIL = {
  /** Clients and chefs who need help; the one shown on the public pages. */
  support: "apoio@aolume.com",
  /** Anything else: press, partnerships, the legal identification of the provider. */
  contact: COMPANY.email,
  /** Terms, notices about illegal content, moderation appeals. */
  legal: "legal@aolume.com",
  /** RGPD rights: access, correction, deletion. */
  privacy: "privacidade@aolume.com",
  /** The sender of transactional mail (bookings, reviews, decisions). */
  bookings: "reservas@aolume.com",
  /** Where the team is told a verification is waiting. */
  verification: "verificacoes@aolume.com",
} as const;

/** Shown at the top of the terms and the privacy policy. */
export const LEGAL_UPDATED = "4 de novembro de 2026";

export const COMPLAINTS_BOOK_URL = "https://www.livroreclamacoes.pt/inicio";
