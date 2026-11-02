import { expect, type Page } from "@playwright/test";

/**
 * Opens a page and waits until it has settled. In dev, pages compile on first visit and
 * hydrate late; acting before that (e.g. picking a file) would miss React's handlers.
 */
export async function openPage(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** Prints browser errors next to the test output, labelled by who saw them. */
export function reportBrowserErrors(page: Page, who: string) {
  page.on("pageerror", (err) => console.log(`[${who}] page error: ${err.message}`));
  page.on("console", (msg) => msg.type() === "error" && console.log(`[${who}] console: ${msg.text()}`));
}

/** Signs in through the real sign-in form and waits until the app has moved on to `next`. */
export async function signIn(page: Page, email: string, password: string, next: string) {
  await openPage(page, `/entrar?next=${encodeURIComponent(next)}`);
  const form = page.locator("form").filter({ has: page.getByLabel("Palavra-passe") });
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Palavra-passe").fill(password);
  await form.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(new RegExp(`${next}$`));
  await page.waitForLoadState("networkidle");
}

/** A small, valid photo the browser can decode and resize, like a picture from a phone. */
export async function samplePhoto(page: Page, name: string) {
  const buffer = await page.screenshot({ clip: { x: 0, y: 0, width: 400, height: 300 }, type: "jpeg" });
  return { name, mimeType: "image/jpeg", buffer };
}

/**
 * Waits for a form's outcome line (components/ui/FormMessage) and fails with the app's own
 * error text, which says far more than a timeout would.
 */
export async function expectSaved(page: Page, text: string | RegExp) {
  const error = page.locator("p.text-danger[role=alert]");
  await expect(page.locator("p[role=status]").filter({ hasText: text }).or(error).first()).toBeVisible();
  if (await error.first().isVisible()) throw new Error(`App reported: ${await error.first().innerText()}`);
}
