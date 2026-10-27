import { PhotoManager } from "@/components/dashboard/PhotoManager";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMyChef, getMyPhotos, getSession } from "@/lib/dashboard";
import { initials } from "@/lib/format";

export default async function Fotografias() {
  const [photos, chef, session] = await Promise.all([getMyPhotos(), getMyChef(), getSession()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Fotografias" description="A sua cara e a sua comida: é o que os clientes veem primeiro." />
      <PhotoManager photos={photos} userId={session.userId} initials={initials(chef?.display_name ?? "")} />
    </div>
  );
}
