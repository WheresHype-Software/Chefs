import { redirect } from "next/navigation";

/** Photos now live on the profile page, with the rest of what clients see. */
export default function Fotografias() {
  redirect("/dashboard/perfil#fotografias");
}
