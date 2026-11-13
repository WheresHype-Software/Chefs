import { redirectLocalized } from "@/lib/i18n/server";

/** Photos now live on the profile page, with the rest of what clients see. */
export default function Fotografias() {
  return redirectLocalized("/dashboard/perfil#fotografias");
}
