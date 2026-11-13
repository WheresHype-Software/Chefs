import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { AzulejoField } from "@/components/brand/Azulejo";

/** Invitation to chefs, set into a wall of tiles like the hero panel. */
export function ChefsCta() {
  const t = useTranslations("home.chefsCta");
  return (
    <section aria-labelledby="chefs-title" className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <AzulejoField variant="glaze" size={168} />
      </div>
      <div className="mx-auto flex max-w-[1280px] px-5 py-20 md:px-8 md:py-28">
        <div className="al-rv flex max-w-[600px] flex-col gap-5 rounded-[4px] bg-white p-6 shadow-[0_24px_60px_-24px_rgb(20_32_51/0.35)] md:p-12">
          <h2 id="chefs-title" className="d m-0 text-[clamp(28px,3.4vw,40px)] leading-[1.04]">
            {t("title")}
          </h2>
          <p className="m-0 text-[17px] leading-relaxed text-ink-3">{t("text")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/entrar?chef=1" className="btn">
              {t("createProfile")}
            </Link>
            <Link href="/para-chefs" className="btn btn-o">
              {t("howItWorks")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
