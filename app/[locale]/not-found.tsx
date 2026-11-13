import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { SiteHeader } from "@/components/SiteChrome";

export default function NotFound() {
  const t = useTranslations("support.notFound");
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto flex max-w-[760px] flex-col items-start gap-5 px-5 py-24 md:px-8">
        <h1 className="d m-0 text-[clamp(38px,6vw,64px)] leading-none">{t("title")}</h1>
        <Link href="/" className="btn">
          {t("backHome")}
        </Link>
      </main>
    </div>
  );
}
