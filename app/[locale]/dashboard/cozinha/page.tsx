import { redirectLocalized } from "@/lib/i18n/server";

/** Cuisines, services and diets now live on the profile page, below the profile itself. */
export default function Cozinha() {
  return redirectLocalized("/dashboard/perfil#cozinha");
}
