-- Ao Lume: chef photo manager (profile photo, captioned dish photos).

-- Verification selfies are for the review team only, never on the public profile.
drop policy if exists chef_photos_public_read on public.chef_photos;
create policy chef_photos_public_read on public.chef_photos for select
  using (public.chef_is_public(chef_id) and kind <> 'selfie');
