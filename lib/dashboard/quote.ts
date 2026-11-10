import "server-only";
import { getSettings } from "../settings";
import { getMyChef } from "./session";

/**
 * The smallest quote this chef can send: with payments on, the signal (the chef's deposit %) must
 * carry the whole minimum commission, so anything lower is refused by the database too. Null when
 * there is no minimum (payments off, or no signal).
 */
export async function quoteMinimum(): Promise<number | null> {
  const [settings, chef] = await Promise.all([getSettings(), getMyChef()]);
  const deposit = chef?.deposit_percent ?? 0;
  if (!settings.paymentsEnabled || deposit <= 0) return null;
  return Math.ceil((settings.commissionMin * 100) / deposit);
}
