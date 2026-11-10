import { LumiCoach, LumiRestore } from "@/components/dashboard/LumiCoach";
import { PhotoManager } from "@/components/dashboard/PhotoManager";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMyChef, getMyPhotos, getSession, lumiOn } from "@/lib/dashboard";
import { initials } from "@/lib/format";
import { PHOTO_TIPS } from "@/lib/lumi-tips";

export default async function Fotografias() {
  const [photos, chef, session, lumi] = await Promise.all([getMyPhotos(), getMyChef(), getSession(), lumiOn()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Fotografias" description="A sua cara e a sua comida: é o que os clientes veem primeiro." />
      <PhotoManager
        photos={photos}
        userId={session.userId}
        initials={initials(chef?.display_name ?? "")}
        approved={chef?.status === "approved"}
      />
      {lumi === "on" && <LumiCoach tips={PHOTO_TIPS} inline followScroll />}
      {lumi === "off" && <LumiRestore />}
    </div>
  );
}
