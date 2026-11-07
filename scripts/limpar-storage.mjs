#!/usr/bin/env node
/**
 * Apagar os ficheiros de teste do armazenamento, antes de limpar a base de dados.
 *
 * O Supabase recusa DELETE directo em storage.objects — há um trigger
 * (storage.protect_delete) que o impede, para não ficarem ficheiros sem linha nem linhas sem
 * ficheiro. A única porta é a API de armazenamento, e é por isso que isto é um guião à parte e
 * não mais umas linhas no SQL.
 *
 * Corre ANTES do supabase/limpar-para-lancamento.sql: aqui ainda há perfis na base de dados para
 * saber de quem é cada pasta. Depois de os apagar, os ficheiros ficam sem dono e sem nome.
 *
 *   node scripts/limpar-storage.mjs            # diz o que ia apagar, não apaga nada
 *   node scripts/limpar-storage.mjs --apagar   # apaga
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

/** Os chefs cujas pastas ficam. Tem de ser igual ao SQL que corre a seguir. */
const KEEP_SLUGS = ["ivo-pacheco", "joana-serafim-candeias"];

/** Baldes que se esvaziam por inteiro: tudo o que lá está nasceu dos testes. */
const WIPE_WHOLE = ["payout-docs", "review-photos"];

/** Baldes organizados por pasta de utilizador, onde só saem as pastas de quem não fica. */
const WIPE_BY_OWNER = ["chef-photos", "chef-docs"];

const apply = process.argv.includes("--apagar");

function env() {
  // O .env.local é a única cópia destas chaves fora do servidor.
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const get = (key) => raw.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim();
  const url = get("NEXT_PUBLIC_SUPABASE_URL");
  const key = get("SUPABASE_SECRET_KEY");
  if (!url || !key) throw new Error("faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY no .env.local");
  return { url, key };
}

/** Lista um balde inteiro, descendo às pastas. A API devolve 100 de cada vez. */
async function listAll(sb, bucket, prefix = "") {
  const out = [];
  for (let page = 0; ; page++) {
    const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 100, offset: page * 100 });
    if (error) throw new Error(`${bucket}: ${error.message}`);
    if (!data?.length) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Uma entrada sem metadata é uma pasta, não um ficheiro.
      if (entry.id === null || entry.metadata === null) out.push(...(await listAll(sb, bucket, path)));
      else out.push(path);
    }
    if (data.length < 100) break;
  }
  return out;
}

async function remove(sb, bucket, paths) {
  if (!paths.length) return;
  // A API aceita até 1000 de cada vez.
  for (let i = 0; i < paths.length; i += 1000) {
    const { error } = await sb.storage.from(bucket).remove(paths.slice(i, i + 1000));
    if (error) throw new Error(`${bucket}: ${error.message}`);
  }
}

const { url, key } = env();
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: keepChefs, error: chefErr } = await sb.from("chefs").select("slug, profile_id").in("slug", KEEP_SLUGS);
if (chefErr) throw new Error(chefErr.message);
if (keepChefs.length !== KEEP_SLUGS.length) {
  throw new Error(`esperava ${KEEP_SLUGS.length} chefs para manter, encontrei ${keepChefs.length} — confirma os slugs`);
}

const { data: admins, error: adminErr } = await sb.from("profiles").select("id").eq("role", "admin");
if (adminErr) throw new Error(adminErr.message);

const keepOwners = new Set([...keepChefs.map((c) => c.profile_id), ...admins.map((a) => a.id)].filter(Boolean));
console.log(`pastas que ficam: ${[...keepOwners].length}`);

let total = 0;
for (const bucket of WIPE_WHOLE) {
  const paths = await listAll(sb, bucket);
  console.log(`${bucket}: ${paths.length} ficheiro(s), todos`);
  if (apply) await remove(sb, bucket, paths);
  total += paths.length;
}

for (const bucket of WIPE_BY_OWNER) {
  const all = await listAll(sb, bucket);
  const doomed = all.filter((p) => !keepOwners.has(p.split("/")[0]));
  console.log(`${bucket}: ${doomed.length} de ${all.length} ficheiro(s)`);
  if (apply) await remove(sb, bucket, doomed);
  total += doomed.length;
}

console.log(
  apply ? `\napagados ${total} ficheiro(s). Agora corre o supabase/limpar-para-lancamento.sql.` : `\n${total} ficheiro(s) iam ser apagados. Repete com --apagar para o fazer.`,
);
