import { getLocale, getTranslations } from "next-intl/server";
import { ChefTitleCard } from "@/components/dashboard/ChefTitleCard";
import { CookingForm } from "@/components/dashboard/CookingForm";
import { LumiCoach } from "@/components/dashboard/LumiCoach";
import { LumiSetting } from "@/components/dashboard/LumiSetting";
import { PhotoManager } from "@/components/dashboard/PhotoManager";
import { PhotoZones } from "@/components/dashboard/PhotoZones";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { redirectLocalized } from "@/lib/i18n/server";
import { getCooking, getMyCertificates, getMyChef, getMyTitleStatements, getMyPhotos, getOffers, getSession, lumiOn } from "@/lib/dashboard";
import { chefTitle, euro, initials, rating } from "@/lib/format";
import { cookingTips, photoTips } from "@/lib/lumi-tips";
import { requiredDepositPercent } from "@/lib/money";
import { getSettings, moneyRules } from "@/lib/settings";

export default async function Perfil() {
  const locale = await getLocale();
  const t = await getTranslations("dashboard.profile");
  const te = await getTranslations("enums");
  const session = await getSession();
  const chef = await getMyChef();
  // Creating the profile happens in the guided flow, which goes on to the photos and the review.
  // Até ser enviado para revisão, o perfil faz-se no passo a passo: aqui havia só o botão de
  // guardar, e quem o carregava achava que tinha acabado e nunca chegava à verificação.
  if (!session.demo && (!chef || chef.status === "draft" || chef.status === "rejected")) return redirectLocalized("/dashboard/comecar");
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
        title={chef ? t("title") : t("createTitle")}
        description={!chef && t("createDescription")}
      />
      {chef && (
        <PhotoZones
          label={t("zonesLabel")}
          zones={[
            {
              id: "dados",
              label: t("zones.profile"),
              done: Boolean(chef.socials.instagram || chef.socials.website),
              status: chef.area_name ?? t("zones.data"),
            },
            {
              id: "fotografias",
              label: t("zones.photos"),
              done: photos.portrait > 0 && photos.gallery >= 3,
              status: photos.gallery >= 3 ? t("zones.dishes", { count: photos.gallery }) : t("zones.dishesOf", { count: photos.gallery }),
            },
            {
              id: "cozinha",
              label: t("zones.cooking"),
              done: Boolean(cooking?.mine.categories.length),
              status: cooking?.mine.categories.length ? t("zones.categories", { count: cooking.mine.categories.length }) : t("zones.missing"),
            },
            { id: "titulo", label: t("zones.title"), done: true, status: chefTitle(chef.badges, locale) },
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
              {t("photosTitle")}
            </h2>
            <p className="m-0 text-sm text-muted">{t("photosText")}</p>
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
              {t("cookingTitle")}
            </h2>
            <p className="m-0 text-sm text-muted">{t("cookingText")}</p>
          </div>
          <CookingForm
            {...cooking}
            preview={{
              name: chef.display_name,
              tier: chefTitle(chef.badges, locale),
              area: chef.area_name ?? "",
              rating: rating(chef.rating_avg, chef.review_count, locale),
              from: prices.length ? euro(Math.min(...prices), locale) : te("price.quoteShort"),
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
            statements={await getMyTitleStatements()}
            userId={session.demo ? null : session.userId}
          />
        </div>
      )}
      {!session.demo && <LumiSetting on={!session.lumiOff} />}
      {lumi === "on" && <LumiCoach tips={[...photoTips(locale), ...cookingTips(locale)]} inline followScroll />}
    </div>
  );
}
