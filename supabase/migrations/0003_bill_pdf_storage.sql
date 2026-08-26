-- Public storage bucket for generated bill PDFs, so a bill can be shared as a
-- real link (not just a Web Share file attachment, which has weak/inconsistent
-- support, no file-sharing target on macOS, for example).
--
-- Objects are keyed by the bill's UUID (not its human-readable bill_number),
-- so the public URLs aren't sequentially guessable: same no-auth trust model
-- as the rest of v1 (see README), just without making every historical bill
-- trivially enumerable.

insert into storage.buckets (id, name, public)
values ('bills', 'bills', true)
on conflict (id) do nothing;

create policy "Public can upload bill PDFs"
on storage.objects for insert
to anon
with check (bucket_id = 'bills');

create policy "Public can update bill PDFs"
on storage.objects for update
to anon
using (bucket_id = 'bills')
with check (bucket_id = 'bills');

create policy "Public can read bill PDFs"
on storage.objects for select
to anon
using (bucket_id = 'bills');
