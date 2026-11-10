import { ChefTitleCard } from "@/components/dashboard/ChefTitleCard";
import { CookingForm } from "@/components/dashboard/CookingForm";
import { LumiCoach } from "@/components/dashboard/LumiCoach";
import { LumiSetting } from "@/components/dashboard/LumiSetting";
import { PhotoManager } from "@/components/dashboard/PhotoManager";
import { PhotoZones } from "@/components/dashboard/PhotoZones";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { redirect } from "next/navigation";
import { getCooking, getMyCertificates, getMyChef, getMyPhotos, getOffers, getSession, lumiOn } from "@/lib/dashboard";
import { chefTitle, euro, initials, rating } from "@/lib/format";
import { COOKING_TIPS, PHOTO_TIPS } from "@/lib/lumi-tips";
import { requiredDepositPercent } from "@/lib/money";
import { getSettings, moneyRules } from "@/lib/settings";

export default async function Perfil() {
  const session = await getSession();
  const chef = await getMyChef();
  // Creating the profile happens in the guided flow, which goes on to the photos and the review.
  // Até ser enviado para revisão, o perfil faz-se no passo a passo: aqui havia só o botão de
  // guardar, e quem o carregava achava que tinha acabado e nunca chegava à verificação.
  if (!session.demo && (!chef || chef.status === "draft" || chef.status === "rejected")) redirect("/dashboard/comecar");
  const settings = await getSettings();
  const minDeposit = settings.paymentsEnabled ? requiredDepositPercent(moneyRules(settings)) : 0;
  const myPhotos = chef ? await getMyPhotos() : [];
  const count = (kind: string) => myPhotos.filter((p) => p.kind === kind).length;
  const photos = { portrait: count("portrait"), selfie: count("selfie"), gallery: count("gallery"), approved: chef?.status === "approved" };

  const [cooking, offers, lumi] = chef ? await Promise.all([getCooking(), getOffers(), lumiOn()]) : [null, [], "done" as const];
  const prices = offers.filter((o) => o.active && o.price != null).map((o) => Number(o.price));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={chef ? "O seu perfil" : "Crie o seu perfil de chef"}
        description={!chef && "Comece pelo essencial. Depois de guardar, carregue as fotos e envie para revisão."}
      />
      {chef && (
        <PhotoZones
          label="Secções do perfil"
          zones={[
            {
              id: "dados",
              label: "Perfil",
              done: Boolean(chef.socials.instagram || chef.socials.website),
              status: chef.area_name ?? "Dados",
            },
            {
              id: "fotografias",
              label: "Fotografias",
              done: photos.portrait > 0 && photos.gallery >= 3,
              status: photos.gallery >= 3 ? `${photos.gallery} pratos` : `${photos.gallery} de 3 pratos`,
            },
            {
              id: "cozinha",
              label: "Cozinha",
              done: Boolean(cooking?.mine.categories.length),
              status: cooking?.mine.categories.length ? `${cooking.mine.categories.length} categorias` : "Em falta",
            },
            { id: "titulo", label: "Título", done: true, status: chefTitle(chef.badges) },
          ]}
        />
      )}
      <div id="dados" className="scroll-mt-36 md:scroll-mt-24">
        <ProfileForm chef={chef} photos={photos} minDeposit={minDeposit} />
      </div>
      {chef && (
        <section id="fotografias" aria-labelledby="fotografias-titulo" className="flex scroll-mt-36 flex-col gap-3.5 md:scroll-mt-24">
          <div className="flex flex-col gap-1">
            <h2 id="fotografias-titulo" className="d m-0 text-[28px] font-normal">
              Fotografias
            </h2>
            <p className="m-0 text-sm text-muted">A sua cara e a sua comida: é o que os clientes veem primeiro.</p>
          </div>
          <PhotoManager
            photos={myPhotos}
            userId={session.userId}
            initials={initials(chef.display_name)}
            approved={chef.status === "approved"}
            zoneBar={false}
          />
        </section>
      )}
      {chef && cooking && (
        <section id="cozinha" aria-labelledby="cozinha-titulo" className="flex scroll-mt-36 flex-col gap-3.5 md:scroll-mt-24">
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
      {chef && (
        <div id="titulo" className="scroll-mt-36 md:scroll-mt-24">
          <ChefTitleCard
            name={chef.display_name}
            badges={chef.badges}
            certificates={await getMyCertificates()}
            userId={session.demo ? null : session.userId}
          />
        </div>
      )}
      {!session.demo && <LumiSetting on={!session.lumiOff} />}
      {lumi === "on" && <LumiCoach tips={[...PHOTO_TIPS, ...COOKING_TIPS]} inline followScroll />}
    </div>
  );
}
