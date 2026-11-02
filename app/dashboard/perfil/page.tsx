import { ChefTitleCard } from "@/components/dashboard/ChefTitleCard";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMyCertificates, getMyChef, getSession } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function Perfil() {
  const session = await getSession();
  const chef = await getMyChef();
  let photos = { portrait: 1, selfie: 1, gallery: 6, approved: false };
  if (!session.demo && chef) {
    const sb = await createClient();
    const { data } = await sb.from("chef_photos").select("kind").eq("chef_id", chef.id);
    const count = (kind: string) => (data ?? []).filter((p) => p.kind === kind).length;
    photos = { portrait: count("portrait"), selfie: count("selfie"), gallery: count("gallery"), approved: chef.status === "approved" };
  } else if (!chef) photos = { portrait: 0, selfie: 0, gallery: 0, approved: false };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={chef ? "O seu perfil" : "Crie o seu perfil de chef"}
        description={!chef && "Comece pelo essencial. Depois de guardar, carregue as fotos e envie para revisão."}
      />
      <ProfileForm chef={chef} photos={photos} />
      {chef && (
        <ChefTitleCard
          name={chef.display_name}
          badges={chef.badges}
          certificates={await getMyCertificates()}
          userId={session.demo ? null : session.userId}
        />
      )}
    </div>
  );
}
