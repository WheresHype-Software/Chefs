import { ChefTitleCard } from "@/components/dashboard/ChefTitleCard";
import { CookingForm } from "@/components/dashboard/CookingForm";
import { LumiCoach } from "@/components/dashboard/LumiCoach";
import { LumiSetting } from "@/components/dashboard/LumiSetting";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { redirect } from "next/navigation";
import { getCooking, getMyCertificates, getMyChef, getOffers, getSession, lumiOn } from "@/lib/dashboard";
import { chefTitle, euro, rating } from "@/lib/format";
import { COOKING_TIPS } from "@/lib/lumi-tips";
import { requiredDepositPercent } from "@/lib/money";
import { getSettings, moneyRules } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export default async function Perfil() {
  const session = await getSession();
  const chef = await getMyChef();
  // Creating the profile happens in the guided flow, which goes on to the photos and the review.
  // Até ser enviado para revisão, o perfil faz-se no passo a passo: aqui havia só o botão de
  // guardar, e quem o carregava achava que tinha acabado e nunca chegava à verificação.
  if (!session.demo && (!chef || chef.status === "draft" || chef.status === "rejected")) redirect("/dashboard/comecar");
  const settings = await getSettings();
  const minDeposit = settings.paymentsEnabled ? requiredDepositPercent(moneyRules(settings)) : 0;
  let photos = { portrait: 1, selfie: 1, gallery: 6, approved: false };
  if (!session.demo && chef) {
    const sb = await createClient();
    const { data } = await sb.from("chef_photos").select("kind").eq("chef_id", chef.id);
    const count = (kind: string) => (data ?? []).filter((p) => p.kind === kind).length;
    photos = { portrait: count("portrait"), selfie: count("selfie"), gallery: count("gallery"), approved: chef.status === "approved" };
  } else if (!chef) photos = { portrait: 0, selfie: 0, gallery: 0, approved: false };

  const [cooking, offers, lumi] = chef ? await Promise.all([getCooking(), getOffers(), lumiOn()]) : [null, [], "done" as const];
  const prices = offers.filter((o) => o.active && o.price != null).map((o) => Number(o.price));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={chef ? "O seu perfil" : "Crie o seu perfil de chef"}
        description={!chef && "Comece pelo essencial. Depois de guardar, carregue as fotos e envie para revisão."}
      />
      <ProfileForm chef={chef} photos={photos} minDeposit={minDeposit} />
      {chef && (
        <ChefTitleCard
          name={chef.display_name}
          badges={chef.badges}
          certificates={await getMyCertificates()}
          userId={session.demo ? null : session.userId}
        />
      )}
      {chef && cooking && (
        <section id="cozinha" aria-labelledby="cozinha-titulo" className="flex scroll-mt-24 flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <h2 id="cozinha-titulo" className="d m-0 text-[28px] font-normal">
              Cozinha e serviços
            </h2>
            <p className="m-0 text-sm text-muted">O que cozinha e como trabalha. Aparece no seu perfil e serve de filtro na pesquisa.</p>
          </div>
          <CookingForm
            {...cooking}
            preview={{
              name: chef.display_name,
              tier: chefTitle(chef.badges),
              area: chef.area_name ?? "",
              rating: rating(chef.rating_avg, chef.review_count),
              from: prices.length ? euro(Math.min(...prices)) : "orçamento",
            }}
          />
        </section>
      )}
      {!session.demo && <LumiSetting on={!session.lumiOff} />}
      {lumi === "on" && <LumiCoach tips={COOKING_TIPS} inline followScroll />}
    </div>
  );
}
