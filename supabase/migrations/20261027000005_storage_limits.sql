-- Ao Lume: size and type limits on uploads (enforced by Storage, not just the browser).

update storage.buckets
set file_size_limit = 8 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id in ('chef-photos', 'review-photos');

update storage.buckets
set file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
where id = 'chef-docs';
