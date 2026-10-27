-- Ao Lume: storage buckets and scheduled jobs.

-- Public photos (profile, gallery, offers, reviews) and private chef documents.
insert into storage.buckets (id, name, public) values
  ('chef-photos', 'chef-photos', true),
  ('review-photos', 'review-photos', true),
  ('chef-docs', 'chef-docs', false)
on conflict (id) do nothing;

-- Files live under "<auth uid>/...", so users only write in their own folder.
create policy "chef photos: owner writes" on storage.objects for insert to authenticated
  with check (bucket_id = 'chef-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "chef photos: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'chef-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "chef photos: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'chef-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chef docs: owner writes" on storage.objects for insert to authenticated
  with check (bucket_id = 'chef-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "chef docs: owner or admin reads" on storage.objects for select to authenticated
  using (bucket_id = 'chef-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Review photos are uploaded by the server on behalf of guests (service role), so no client policy.

-- Scheduled jobs: request expiry (48 h) and auto-complete (24 h after the date).
create extension if not exists pg_cron;

select cron.schedule('ao-lume-expire-requests', '*/15 * * * *', $$select public.expire_stale_requests()$$);
select cron.schedule('ao-lume-auto-complete', '17 * * * *', $$select public.auto_complete_bookings()$$);
