// What an application needs before it can go public. Shared by the admin page (ordering), the
// queue (bulk approval) and each card (the checklist), so "pronto" means the same everywhere.

export type ReadinessInput = {
  bio: string | null;
  socials: { instagram?: string; website?: string };
  chef_photos: { kind: string; caption: string | null }[];
  offers: { count: number }[];
};

export type Check = { label: string; ok: boolean; required: boolean };

export function readiness(c: ReadinessInput): { checks: Check[]; missing: Check[]; ready: boolean } {
  const hasFace = c.chef_photos.some((p) => p.kind === "portrait" || p.kind === "selfie");
  const dishes = c.chef_photos.filter((p) => p.kind === "gallery");
  const described = dishes.filter((d) => d.caption?.trim()).length;
  const offerCount = c.offers[0]?.count ?? 0;
  const checks: Check[] = [
    { label: "Fotografia de perfil", ok: hasFace, required: true },
    { label: `Pratos ${dishes.length}/3`, ok: dishes.length >= 3, required: true },
    { label: "Instagram ou site", ok: Boolean(c.socials.instagram || c.socials.website), required: true },
    { label: `Descrições ${described}/${dishes.length}`, ok: dishes.length > 0 && described === dishes.length, required: false },
    { label: "Sobre si", ok: (c.bio?.trim().length ?? 0) >= 40, required: false },
    { label: `Ofertas ${offerCount}`, ok: offerCount > 0, required: false },
  ];
  const missing = checks.filter((x) => !x.ok && x.required);
  return { checks, missing, ready: missing.length === 0 };
}
