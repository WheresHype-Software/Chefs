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

export type MyTitleStatement = { id: string; created_at: string };

/** Descriptions of experience the chef sent instead of a certificate, still waiting for the team. */
export async function getMyTitleStatements(): Promise<MyTitleStatement[]> {
  const scope = await chefScope();
  if (scope.demo) return [];
  const { data } = await scope.sb.from("chef_title_statements").select("id, created_at").eq("chef_id", scope.chef.id).order("created_at");
  return (data ?? []) as MyTitleStatement[];
}
