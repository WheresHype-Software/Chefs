import "server-only";
import { chefScope } from "./session";

export type MyCertificate = { id: string; title: string };

/** Certificates the chef has sent; the team reviews them before granting the "Chef" title. */
export async function getMyCertificates(): Promise<MyCertificate[]> {
  const scope = await chefScope();
  if (scope.demo) return [];
  const { data } = await scope.sb.from("chef_certifications").select("id, title").eq("chef_id", scope.chef.id).order("title");
  return (data ?? []) as MyCertificate[];
}
