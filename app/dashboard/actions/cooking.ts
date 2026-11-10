"use server";

import { MAX_CATEGORIES } from "@/lib/constants";
import { fail, failWith, ok, type ActionResult as Result } from "@/lib/result";
import type { ServiceType } from "@/lib/types";
import { chefContext, done, NO_CHEF } from "./context";

const ADD_ERRORS: Record<string, string> = {
  bad_name: "Escreva o nome da cozinha, entre 3 e 40 caracteres.",
  too_many: "Já acrescentou três cozinhas novas. Para mais, fale connosco.",
  not_a_chef: NO_CHEF,
};

/**
 * Finds or adds a cuisine that isn't on the list (add_cuisine_category, migration
 * 20261110000001) and returns it, so the form can tick it. Choosing it still needs a save.
 */
export async function addCuisine(name: string): Promise<{ ok: true; id: number; name: string } | { ok: false; error: string }> {
  const clean = name.replace(/\s+/g, " ").trim();
  const ctx = await chefContext();
  if (ctx.demo) return { ok: true, id: -Date.now(), name: clean };
  if (!ctx.chef) return { ok: false, error: NO_CHEF };
  const { data, error } = await ctx.sb.rpc("add_cuisine_category", { p_name: clean });
  if (error) {
    const known = Object.keys(ADD_ERRORS).find((k) => error.message.includes(k));
    if (known) return { ok: false, error: ADD_ERRORS[known]! };
    const r = failWith(error, "addCuisine", "Não foi possível acrescentar a cozinha. Tente de novo.");
    return r.ok ? { ok: false, error: "" } : r;
  }
  const { data: row } = await ctx.sb
    .from("cuisine_categories")
    .select("id, name_pt")
    .eq("id", data as number)
    .single();
  return { ok: true, id: data as number, name: (row?.name_pt as string | undefined) ?? clean };
}

/** Replaces the chef's cuisine categories, diets and services. */
export async function saveCooking(categories: number[], diets: number[], services: ServiceType[]): Promise<Result> {
  if (categories.length > MAX_CATEGORIES) return fail(`Escolha até ${MAX_CATEGORIES} categorias.`);
  const ctx = await chefContext();
  if (ctx.demo) return ok();
  if (!ctx.chef) return fail(NO_CHEF);
  const id = ctx.chef.id;
  await ctx.sb.from("chef_categories").delete().eq("chef_id", id);
  await ctx.sb.from("chef_diets").delete().eq("chef_id", id);
  await ctx.sb.from("chef_services").delete().eq("chef_id", id);
  const results = await Promise.all([
    categories.length ? ctx.sb.from("chef_categories").insert(categories.map((category_id) => ({ chef_id: id, category_id }))) : null,
    diets.length ? ctx.sb.from("chef_diets").insert(diets.map((diet_id) => ({ chef_id: id, diet_id }))) : null,
    services.length ? ctx.sb.from("chef_services").insert(services.map((service) => ({ chef_id: id, service }))) : null,
  ]);
  const err = results.find((r) => r?.error)?.error;
  return err ? failWith(err, "saveCooking", "Não foi possível guardar. Tente de novo.") : done();
}
