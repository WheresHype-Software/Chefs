import { notFound } from "next/navigation";

/** Any path that is not a page, in any language, gets the localized not-found page. */
export default function CatchAll() {
  notFound();
}
