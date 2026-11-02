/** Every record a run creates carries this prefix, so cleanup can find leftovers of crashed runs too. */
export const E2E_PREFIX = "e2e";
export const E2E_EMAIL_DOMAIN = "aolume.test";

const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const email = (role: string) => `${E2E_PREFIX}-${id}-${role}@${E2E_EMAIL_DOMAIN}`;

export const run = {
  id,
  password: `E2e-${id}-pass!`,
  admin: { email: email("admin"), name: "E2E Admin" },
  chef: { email: email("chef"), name: `E2E Chef ${id}`, slug: `${E2E_PREFIX}-chef-${id}` },
  client: { email: email("client"), name: "Teste Cliente", phone: "+351 912 345 678" },
  offer: { title: `Jantar de teste ${id}`, price: 25, guests: 4 },
  review: `Tudo impecável (${id}).`,
};

/** A bookable day two days ahead (clear of lead time and time zones), as the app's local ISO day. */
export function bookingDay(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    day: d.getDate(),
    month: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
    /** The booking calendar opens on the current month. */
    isNextMonth: d.getMonth() !== now.getMonth(),
  };
}
