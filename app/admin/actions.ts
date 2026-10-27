"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/dashboard";
import { sendEmail, siteUrl } from "@/lib/email";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

type Decision = "approved" | "rejected" | "suspended";

/** RLS already blocks non-admins; this check fails fast with a clear message. */
async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return !session.demo && session.role === "admin";
}

export async function reviewChef(chefId: string, decision: Decision, note: string, badges: string[]): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Sem permissão.");
  const sb = await createClient();
  const { error } = await sb.rpc("admin_review_chef", {
    p_chef_id: chefId,
    p_status: decision,
    p_note: note || null,
    p_badges: badges,
  });
  if (error) return fail(error.message);

  const { data } = await sb.from("chefs").select("display_name, slug, profiles(email)").eq("id", chefId).single();
  const email = (data?.profiles as unknown as { email: string } | null)?.email;
  if (email) {
    await sendEmail({
      to: email,
      subject: decision === "approved" ? "O seu perfil Ao Lume foi aprovado" : "O seu perfil Ao Lume precisa de alterações",
      text:
        decision === "approved"
          ? `Olá ${data?.display_name},\n\nO seu perfil já está no mapa: ${siteUrl(`/chef/${data?.slug}`)}\nPartilhe o link na bio do Instagram.\n\nAo Lume`
          : `Olá ${data?.display_name},\n\nRevimos o seu perfil e precisamos de algumas alterações:\n${note}\n\nAtualize em ${siteUrl("/dashboard/perfil")} e volte a enviar.\n\nAo Lume`,
    });
  }
  revalidatePath("/admin");
  return ok();
}

export async function moderateReview(reviewId: string, reportId: string, action: "keep" | "hide" | "delete"): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Sem permissão.");
  const sb = await createClient();
  if (action === "hide") await sb.from("reviews").update({ status: "hidden" }).eq("id", reviewId);
  if (action === "delete") await sb.from("reviews").delete().eq("id", reviewId);
  await sb
    .from("reports")
    .update({ status: action === "keep" ? "dismissed" : "resolved" })
    .eq("id", reportId);
  const {
    data: { user },
  } = await sb.auth.getUser();
  await sb.from("admin_logs").insert({ admin_id: user?.id, action: `review_${action}`, target: reviewId });
  revalidatePath("/admin");
  return ok();
}
