/**
 * Chefs type their Instagram every way there is: "@nome", "nome", a full profile link with
 * tracking on the end, or their display name. Links are built only from a real username.
 */

/** Instagram's own rule: letters, numbers, dots and underscores, up to 30. */
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;

/** The username in what was typed, or null when there isn't one (a name, a post link, junk). */
export function instagramHandle(raw: string | null | undefined): string | null {
  let s = (raw ?? "").trim();
  if (!s) return null;
  const url = s.match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/([^/?#]+)\/?(?:[?#].*)?$/i);
  if (url) s = url[1]!;
  s = s.replace(/^@/, "");
  return HANDLE.test(s) ? s : null;
}

export function instagramUrl(handle: string): string {
  return `https://www.instagram.com/${handle}/`;
}
