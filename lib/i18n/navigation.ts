import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware drop-ins for next/link and next/navigation: `<Link href="/procurar">` goes to
 * /procurar in Portuguese and /en/procurar in English. Use these for every internal link.
 */
export const { Link, redirect, usePathname, useRouter, getPathname, permanentRedirect } = createNavigation(routing);
