import { toEuros } from "../money";

/**
 * The yearly report Portugal requires from platforms that intermediate payments (DL 20/2022,
 * the DAC7 directive): who sold through us, what they were paid, and what we kept.
 *
 * This builds the data, not the filing. The AT wants it through their own channel, in their own
 * format, by 31 January — so what comes out of here is a spreadsheet for the accountant to work
 * from, with everything the directive asks for and the quarters already split.
 *
 * Pure, so the awkward part (quarters, totals, what counts as consideration) can be tested
 * without a database.
 */

export type Dac7Seller = {
  chefId: string;
  entityType: "individual" | "company";
  legalName: string;
  nif: string;
  country: string;
  address: string;
  postalCode: string;
  city: string;
  birthDate: string | null;
  birthPlace: string | null;
  companyRegNumber: string | null;
  iban: string | null;
  ibanHolder: string | null;
};

/** One completed booking that moved money, with the date that decides its quarter. */
export type Dac7Activity = {
  chefId: string;
  /** ISO date the payout was made — what the report counts. */
  paidAt: string;
  /** What the chef actually received. */
  payout: number;
  /** What we kept. */
  commission: number;
  /** The whole value of the booking, for the accountant to reconcile against the chef's invoices. */
  bookingValue: number;
};

export type Dac7Row = {
  seller: Dac7Seller;
  quarters: { consideration: number; fees: number; activities: number }[];
  totals: { consideration: number; fees: number; activities: number; bookingValue: number };
};

const round = (n: number) => toEuros(Math.round(n * 100));

export function quarterOf(isoDate: string): number {
  const month = Number(isoDate.slice(5, 7));
  return Math.floor((month - 1) / 3);
}

/** Groups a year's activity by seller and quarter. Sellers with nothing paid are left out. */
export function buildDac7Rows(sellers: Dac7Seller[], activities: Dac7Activity[], year: number): Dac7Row[] {
  const inYear = activities.filter((a) => a.paidAt.slice(0, 4) === String(year));
  const bySeller = new Map<string, Dac7Activity[]>();
  for (const a of inYear) {
    const list = bySeller.get(a.chefId);
    if (list) list.push(a);
    else bySeller.set(a.chefId, [a]);
  }

  const rows: Dac7Row[] = [];
  for (const seller of sellers) {
    const mine = bySeller.get(seller.chefId);
    if (!mine?.length) continue;
    const quarters = [0, 1, 2, 3].map((q) => {
      const inQuarter = mine.filter((a) => quarterOf(a.paidAt) === q);
      return {
        consideration: round(inQuarter.reduce((s, a) => s + a.payout, 0)),
        fees: round(inQuarter.reduce((s, a) => s + a.commission, 0)),
        activities: inQuarter.length,
      };
    });
    rows.push({
      seller,
      quarters,
      totals: {
        consideration: round(quarters.reduce((s, q) => s + q.consideration, 0)),
        fees: round(quarters.reduce((s, q) => s + q.fees, 0)),
        activities: mine.length,
        bookingValue: round(mine.reduce((s, a) => s + a.bookingValue, 0)),
      },
    });
  }
  return rows.sort((a, b) => a.seller.legalName.localeCompare(b.seller.legalName, "pt"));
}

const HEADER = [
  "tipo",
  "nome_legal",
  "nif",
  "pais_nif",
  "morada",
  "codigo_postal",
  "localidade",
  "data_nascimento",
  "local_nascimento",
  "registo_comercial",
  "iban",
  "titular_conta",
  "q1_contrapartida",
  "q1_comissao",
  "q1_atividades",
  "q2_contrapartida",
  "q2_comissao",
  "q2_atividades",
  "q3_contrapartida",
  "q3_comissao",
  "q3_atividades",
  "q4_contrapartida",
  "q4_comissao",
  "q4_atividades",
  "total_contrapartida",
  "total_comissao",
  "total_atividades",
  "total_valor_reservas",
];

const cell = (value: unknown) => {
  const s = value == null ? "" : String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const money = (n: number) => n.toFixed(2);

export function buildDac7Csv(rows: Dac7Row[]): string {
  const lines = rows.map((r) =>
    [
      r.seller.entityType === "company" ? "entidade" : "singular",
      r.seller.legalName,
      r.seller.nif,
      r.seller.country,
      r.seller.address,
      r.seller.postalCode,
      r.seller.city,
      r.seller.birthDate ?? "",
      r.seller.birthPlace ?? "",
      r.seller.companyRegNumber ?? "",
      r.seller.iban ?? "",
      r.seller.ibanHolder ?? "",
      ...r.quarters.flatMap((q) => [money(q.consideration), money(q.fees), String(q.activities)]),
      money(r.totals.consideration),
      money(r.totals.fees),
      String(r.totals.activities),
      money(r.totals.bookingValue),
    ]
      .map(cell)
      .join(";"),
  );
  return [HEADER.join(";"), ...lines].join("\n");
}

/** What is missing before this can be filed, per seller. An empty list means the row is complete. */
export function dac7Gaps(row: Dac7Row): string[] {
  const s = row.seller;
  const gaps: string[] = [];
  if (!s.legalName) gaps.push("nome legal");
  if (!s.nif) gaps.push("NIF");
  if (!s.address || !s.postalCode || !s.city) gaps.push("morada fiscal");
  if (s.entityType === "individual" && (!s.birthDate || !s.birthPlace)) gaps.push("data e local de nascimento");
  if (s.entityType === "company" && !s.companyRegNumber) gaps.push("registo comercial");
  if (!s.iban) gaps.push("IBAN");
  return gaps;
}
