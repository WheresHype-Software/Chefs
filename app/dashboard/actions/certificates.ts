"use server";

import { z } from "zod";
import { getSession } from "@/lib/dashboard";
import { fail, failWith, ok, type ActionResult as Result } from "@/lib/result";
import { chefContext, done, NO_CHEF } from "./context";

// A cooking certificate the team checks before the chef may be called "Chef".
const CertificateInput = z.object({
  title: z.string().trim().min(2).max(120),
  // "<user id>/cert-<uuid>.<ext>" in the private chef-docs bucket.
  path: z.string().regex(/^[0-9a-f-]{36}\/cert-[0-9a-f-]{36}\.(pdf|jpg|png)$/),
});

export async function addCertificate(title: string, path: string): Promise<Result> {
  const parsed = CertificateInput.safeParse({ title, path });
  if (!parsed.success) return fail("Indique o nome do certificado (por exemplo, Curso de Cozinha).");
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  // Only files the chef uploaded to their own folder (the storage policy allows nothing else).
  const session = await getSession();
  if (!parsed.data.path.startsWith(`${session.userId}/`)) return fail("Documento inválido.");
  const { error } = await ctx.sb.from("chef_certifications").insert({
    chef_id: ctx.chef.id,
    title: parsed.data.title,
    document_path: parsed.data.path,
  });
  return error ? failWith(error, "addCertificate", "Não foi possível guardar o certificado. Tente de novo.") : done("/dashboard/perfil");
}
