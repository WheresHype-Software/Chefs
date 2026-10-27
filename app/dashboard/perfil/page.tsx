import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMyChef, getSession } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function Perfil() {
  const session = await getSession();
  const chef = await getMyChef();
  let photos = { selfie: 1, gallery: 6 };
  if (!session.demo && chef) {
    const sb = await createClient();
    const { data } = await sb.from("chef_photos").select("kind").eq("chef_id", chef.id);
    photos = {
      // The profile photo (or, on older accounts, the verification selfie).
      selfie: (data ?? []).filter((p) => p.kind === "portrait" || p.kind === "selfie").length,
      gallery: (data ?? []).filter((p) => p.kind === "gallery").length,
    };
  } else if (!chef) photos = { selfie: 0, gallery: 0 };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={chef ? "O seu perfil" : "Crie o seu perfil de chef"}
        description={!chef && "Comece pelo essencial. Depois de guardar, carregue as fotos e envie para revisão."}
      />
      <ProfileForm chef={chef} photos={photos} />
    </div>
  );
}
