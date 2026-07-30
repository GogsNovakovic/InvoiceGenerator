-- 0012_storage_invoices_bucket.sql
-- Private bucket for invoice PDFs. See docs/DB.md §5.5.
--
-- Object path convention: {user_id}/{invoice_id}.pdf, which makes the first
-- path segment the owner and lets the policies be a simple folder check.

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

create policy invoice_pdf_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy invoice_pdf_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy invoice_pdf_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy invoice_pdf_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
