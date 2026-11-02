"use server";

import { MAX_CATEGORIES } from "@/lib/constants";
import { fail, failWith, ok, type ActionResult as Result } from "@/lib/result";
import type { ServiceType } from "@/lib/types";
import { chefContext, done, NO_CHEF } from "./context";

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
