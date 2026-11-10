import "server-only";
import { setupComplete } from "@/components/dashboard/SetupChecklist";
import { getMyChef, getSession } from "./session";
import { getSetupProgress } from "./setup";

/**
 * Whether Lumi, the mascot, guides this page: "on", "off" (the chef turned her off; pages offer a
 * link back) or "done" (nothing left to guide). Never once the chef turned her off; on the
 * onboarding steps always otherwise; elsewhere only until the first steps (photos, an offer, open
 * days, the review, billing when payments are on) are all done. Past that she'd only be in the way.
 */
export async function lumiOn({ onboarding = false }: { onboarding?: boolean } = {}): Promise<"on" | "off" | "done"> {
  const session = await getSession();
  if (session.lumiOff) return "off";
  if (onboarding) return "on";
  const chef = await getMyChef();
  if (!chef) return "on";
  return setupComplete(chef, await getSetupProgress()) ? "done" : "on";
}
