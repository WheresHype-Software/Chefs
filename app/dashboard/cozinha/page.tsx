import { redirect } from "next/navigation";

/** Cuisines, services and diets now live on the profile page, below the profile itself. */
export default function Cozinha() {
  redirect("/dashboard/perfil#cozinha");
}
