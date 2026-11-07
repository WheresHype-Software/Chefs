import "server-only";
import { z } from "zod";
import { serverEnv } from "../env.server";
import { toEuros } from "../money";
import { normaliseWord as normalise, readInfoResponse, readStatus } from "./status";
import type {
  CreatedPayment,
  CreateCardInput,
  CreateMbwayInput,
  CreateMultibancoInput,
  PaymentProvider,
  ProviderResult,
  ProviderStatus,
  RefundInput,
  StatusQuery,
} from "./types";

/**
 * EuPago, the only file in the app that knows the provider's name.
 *
 * Two generations of their API live side by side: MB WAY and the management endpoints speak JSON
 * with an `ApiKey` or `Bearer` header, while Multibanco references still use the older form with
 * the key in the body and Portuguese field names. Both are wrapped here so the rest of the app
 * never sees the difference.
 *
 * Nothing in this file decides anything. It reports what the provider said; `lib/payments/confirm`
 * is what acts on it, after checking the amount against our own records.
 */

const BASE = {
  sandbox: "https://sandbox.eupago.pt",
  production: "https://clientes.eupago.pt",
} as const;

// Creating a payment happens while somebody waits, so it fails fast. Asking what became of one
// runs in the background, and EuPago's older endpoints can take their time — cutting that off at
// twelve seconds turns a slow answer into no answer, and a paid booking into a stuck one.
const TIMEOUT_MS = 12_000;
const LOOKUP_TIMEOUT_MS = 30_000;

/** Errors shown to people say nothing about the provider; the details go to the server log. */
function providerError(context: string, detail: unknown, code?: string): ProviderResult<never> {
  console.error(`[eupago] ${context}:`, detail);
  const technical = typeof detail === "string" ? detail : JSON.stringify(detail ?? null);
  return {
    ok: false,
    error: "Não foi possível iniciar o pagamento. Tente de novo dentro de momentos.",
    code,
    detail: `${context} · ${technical}`.slice(0, 500),
  };
}

async function postJson(
  path: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs = TIMEOUT_MS,
): Promise<ProviderResult<unknown>> {
  const url = `${BASE[serverEnv.eupago.env] ?? BASE.sandbox}${path}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      return providerError(`${path} returned non-JSON (${res.status})`, text.slice(0, 300), "non_json");
    }
    if (!res.ok) return providerError(`${path} ${res.status}`, parsed);
    return { ok: true, data: parsed };
  } catch (err) {
    return providerError(`${path} unreachable`, err instanceof Error ? `${err.name}: ${err.message}` : err, "unreachable");
  }
}

async function getJson(path: string, headers: Record<string, string>, timeoutMs = TIMEOUT_MS): Promise<ProviderResult<unknown>> {
  const url = `${BASE[serverEnv.eupago.env] ?? BASE.sandbox}${path}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!res.ok) return providerError(`${path} ${res.status}`, parsed);
    return { ok: true, data: parsed };
  } catch (err) {
    return providerError(`${path} failed`, err instanceof Error ? `${err.name}: ${err.message}` : err, "unreachable");
  }
}

function apiKeyHeader(): Record<string, string> {
  return { Authorization: `ApiKey ${serverEnv.eupago.apiKey ?? ""}` };
}

// --- OAuth, for the management endpoints (refunds, transaction lookups) ------
const TokenResponse = z.object({ access_token: z.string(), expires_in: z.string().or(z.number()).nullish() });
let token: { value: string; until: number } | null = null;

async function bearer(): Promise<string | null> {
  if (token && token.until > Date.now() + 30_000) return token.value;
  const { clientId, clientSecret } = serverEnv.eupago;
  if (!clientId || !clientSecret) return null;
  const res = await postJson("/api/auth/token", { client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }, {});
  if (!res.ok) return null;
  const parsed = TokenResponse.safeParse(res.data);
  if (!parsed.success) return null;
  // expires_in comes back as a timestamp string ("2022-01-10 10:47:41"); fall back to 10 minutes.
  const until = typeof parsed.data.expires_in === "string" ? Date.parse(parsed.data.expires_in.replace(" ", "T")) : NaN;
  token = { value: parsed.data.access_token, until: Number.isFinite(until) ? until : Date.now() + 600_000 };
  return token.value;
}

// --- Responses ---------------------------------------------------------------
// nullish, never optional: the provider sends null in fields it has nothing for, and a schema
// that only tolerates absence throws away the whole reply over one of them. That is how a paid
// card payment spent an afternoon looking unpaid.
const MbwayResponse = z.object({
  transactionStatus: z.string().nullish(),
  transactionID: z.string().nullish(),
  reference: z.union([z.string(), z.number()]).nullish(),
  code: z.string().nullish(),
  text: z.string().nullish(),
});

const MultibancoResponse = z.object({
  sucesso: z.boolean().nullish(),
  estado: z.number().nullish(),
  resposta: z.string().nullish(),
  referencia: z.union([z.string(), z.number()]).nullish(),
  entidade: z.union([z.string(), z.number()]).nullish(),
  valor: z.union([z.string(), z.number()]).nullish(),
  data_fim: z.string().nullish(),
  transacao: z.union([z.string(), z.number()]).nullish(),
});

const TridResponse = z.object({
  transactionStatus: z.string().nullish(),
  transactionInfo: z
    .object({
      trid: z.union([z.string(), z.number()]).nullish(),
      reference: z.union([z.string(), z.number()]).nullish(),
      amount: z.union([z.string(), z.number()]).nullish(),
      status: z.string().nullish(),
    })
    .nullish(),
});

const CardResponse = z.object({
  transactionStatus: z.string().nullish(),
  transactionID: z.string().nullish(),
  reference: z.union([z.string(), z.number()]).nullish(),
  redirectUrl: z.string().nullish(),
  code: z.string().nullish(),
  text: z.string().nullish(),
});

const RefundResponse = z.object({
  transactionStatus: z.string().nullish(),
  refundId: z.union([z.string(), z.number()]).nullish(),
  code: z.string().nullish(),
  text: z.string().nullish(),
});

const str = (v: unknown): string | null => (v == null || v === "" ? null : String(v));
const cents = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

export const eupago: PaymentProvider = {
  name: "eupago",

  /** MB WAY: the client approves it in their phone, and they have five minutes to do it. */
  async createMbway(input: CreateMbwayInput): Promise<ProviderResult<CreatedPayment>> {
    if (!serverEnv.eupago.apiKey) return providerError("createMbway", "no API key", "not_configured");
    const res = await postJson(
      "/api/v1.02/mbway/create",
      {
        payment: {
          identifier: input.identifier,
          amount: { value: toEuros(input.amountCents), currency: "EUR" },
          // Nine digits, no country code. Their own documented example (+351912345678) is
          // rejected by their sandbox with CUSTOMERPHONE_INVALID; this form returns 201.
          customerPhone: input.phone,
          countryCode: "+351",
        },
        customer: { notify: true, name: input.name ?? undefined, email: input.email ?? undefined },
      },
      apiKeyHeader(),
    );
    if (!res.ok) return res;
    const parsed = MbwayResponse.safeParse(res.data);
    if (!parsed.success) return providerError("createMbway shape", res.data);
    if (normalise(parsed.data.transactionStatus) !== "success") {
      return providerError("createMbway rejected", parsed.data, parsed.data.code ?? undefined);
    }
    return {
      ok: true,
      data: {
        providerReference: str(parsed.data.reference),
        providerTransactionId: str(parsed.data.transactionID),
        entity: null,
        // Their window is five minutes; one more covers the round trip without promising longer.
        expiresAt: new Date(Date.now() + 6 * 60_000).toISOString(),
      },
    };
  },

  /** A Multibanco reference: entity, reference and amount, payable until the given day. */
  async createMultibanco(input: CreateMultibancoInput): Promise<ProviderResult<CreatedPayment>> {
    const chave = serverEnv.eupago.apiKey;
    if (!chave) return providerError("createMultibanco", "no API key", "not_configured");
    const res = await postJson(
      "/clientes/rest_api/multibanco/create",
      {
        chave,
        valor: toEuros(input.amountCents),
        id: input.identifier,
        per_dup: 0, // pay once, not a reusable reference
        data_fim: input.expiresOn,
        failOver: "0",
        email: input.email ?? undefined,
        contacto: input.phone ?? undefined,
      },
      {},
    );
    if (!res.ok) return res;
    const parsed = MultibancoResponse.safeParse(res.data);
    if (!parsed.success) return providerError("createMultibanco shape", res.data);
    if (parsed.data.sucesso !== true || !parsed.data.referencia) {
      return providerError("createMultibanco rejected", parsed.data, String(parsed.data.estado ?? ""));
    }
    return {
      ok: true,
      data: {
        providerReference: str(parsed.data.referencia),
        providerTransactionId: str(parsed.data.transacao),
        entity: str(parsed.data.entidade),
        expiresAt: input.expiresOn,
      },
    };
  },

  /**
   * Card: the client never types a number on our page. EuPago returns the address of their own
   * secure form, with 3D Secure, and the browser goes there. We only learn the outcome the same
   * way as everything else: by asking.
   */
  async createCard(input: CreateCardInput): Promise<ProviderResult<CreatedPayment>> {
    if (!serverEnv.eupago.apiKey) return providerError("createCard", "no API key", "not_configured");
    const res = await postJson(
      "/api/v1.02/creditcard/create",
      {
        payment: {
          identifier: input.identifier,
          amount: { value: toEuros(input.amountCents), currency: "EUR" },
          successUrl: input.successUrl,
          failUrl: input.failUrl,
          backUrl: input.backUrl,
          lang: "PT",
        },
        customer: { notify: true, email: input.email ?? undefined },
      },
      apiKeyHeader(),
    );
    if (!res.ok) return res;
    const parsed = CardResponse.safeParse(res.data);
    if (!parsed.success) return providerError("createCard shape", res.data);
    if (normalise(parsed.data.transactionStatus) !== "success" || !parsed.data.redirectUrl) {
      return providerError("createCard rejected", parsed.data, parsed.data.code ?? undefined);
    }
    return {
      ok: true,
      data: {
        providerReference: str(parsed.data.reference),
        providerTransactionId: str(parsed.data.transactionID),
        entity: null,
        // The hosted form stays up for a day by default; we do not promise longer than an hour.
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        redirectUrl: parsed.data.redirectUrl,
      },
    };
  },

  /**
   * What the provider says about a payment, asked directly. Every state change in the app goes
   * through this, including after a webhook: the notification is a nudge, this is the authority.
   */
  async status(query: StatusQuery): Promise<ProviderResult<ProviderStatus>> {
    if (query.transactionId) {
      const auth = await bearer();
      if (auth) {
        const res = await getJson(
          `/api/management/v1.02/payouts/transactions/${encodeURIComponent(query.transactionId)}`,
          { Authorization: `Bearer ${auth}` },
          LOOKUP_TIMEOUT_MS,
        );
        if (res.ok) {
          const parsed = TridResponse.safeParse(res.data);
          if (parsed.success && parsed.data.transactionInfo) {
            const info = parsed.data.transactionInfo;
            return {
              ok: true,
              data: {
                status: readStatus(info.status),
                amountCents: cents(info.amount),
                providerTransactionId: str(info.trid),
                raw: res.data,
              },
            };
          }
        }
        // Fall through to the reference lookup: a trid lookup failing is not an answer.
      }
    }

    if (!query.reference) return providerError("status", "nothing to look up", "no_reference");
    const res = await postJson(
      "/clientes/rest_api/multibanco/info",
      { chave: serverEnv.eupago.apiKey ?? "", referencia: query.reference, entidade: query.entity ?? undefined },
      {},
      LOOKUP_TIMEOUT_MS,
    );
    if (!res.ok) return res;
    // Read by lib/payments/status, which is pure and tested against the provider's real replies.
    // A zod schema here once rejected a settled payment over a single null field.
    const read = readInfoResponse(res.data);
    if (!read) return providerError("status rejected", res.data, "refused");
    return {
      ok: true,
      data: {
        status: read.status,
        amountCents: read.amountCents,
        providerTransactionId: read.transactionId,
        raw: res.data,
      },
    };
  },

  /**
   * Sends money back. MB WAY and card go straight back to where they came from; a Multibanco
   * reference has no return path, so the provider needs an IBAN and the caller has to supply one.
   */
  async refund(input: RefundInput): Promise<ProviderResult<{ refundId: string | null }>> {
    const auth = await bearer();
    if (!auth) return providerError("refund", "no OAuth credentials", "not_configured");
    const res = await postJson(
      `/api/management/v1.02/refund/${encodeURIComponent(input.transactionId)}`,
      {
        amount: toEuros(input.amountCents),
        reason: input.reason.slice(0, 200),
        iban: input.iban ?? undefined,
        bic: input.bic ?? undefined,
      },
      { Authorization: `Bearer ${auth}` },
    );
    if (!res.ok) return res;
    const parsed = RefundResponse.safeParse(res.data);
    if (!parsed.success) return providerError("refund shape", res.data);
    if (normalise(parsed.data.transactionStatus) !== "success") {
      return providerError("refund rejected", parsed.data, parsed.data.code ?? undefined);
    }
    return { ok: true, data: { refundId: str(parsed.data.refundId) } };
  },
};
