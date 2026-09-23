-- Module 1 (Lessons Learned Vault) gap-closure, part 3/3: real file
-- attachments on a vault entry (a screenshot, a log excerpt, a small
-- PDF). This is the first real Supabase Storage usage in this app —
-- "FileVault" (src/lib/vault/service.ts) never stored an uploaded file
-- at all; it regenerates DOCX/PDF/PPTX on demand from
-- deliverable_versions.content and was never a real place to reuse here.
--
-- A private bucket, not public — every object's path is
-- {account_id}/{knowledge_vault_entry_id}/{uuid}-{filename}, the standard
-- Supabase multi-tenant storage convention: account_id is embedded in
-- the path itself (never taken from user input — the upload code builds
-- it from the authenticated session's own account_id) so storage.objects
-- RLS can check it directly via storage.foldername() without a join back
-- to any metadata table.
insert into storage.buckets (id, name, public)
values ('vault-attachments', 'vault-attachments', false);

create policy "vault_attachments_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'vault-attachments'
    and (storage.foldername(name))[1] = auth_account_id()::text
  );

create policy "vault_attachments_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'vault-attachments'
    and (storage.foldername(name))[1] = auth_account_id()::text
  );

create policy "vault_attachments_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'vault-attachments'
    and (storage.foldername(name))[1] = auth_account_id()::text
  );

-- The metadata row alongside each uploaded object — what a vault entry's
-- own page lists and links to download, independent of the storage
-- object itself. No account_id of its own; RLS checks ownership through
-- the parent knowledge_vault_entries row, same pattern as
-- sop_vault_entry_links (migration 0036). Any account member can manage
-- any entry's attachments, matching knowledge_vault_entries' own RLS
-- (account-scoped, not restricted to the original author).
create table public.vault_entry_attachments (
  id uuid primary key default gen_random_uuid(),
  knowledge_vault_entry_id uuid not null references public.knowledge_vault_entries(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null,
  uploaded_by_user_id uuid references public.users(id) on delete set null,
  uploaded_by_email text not null,
  created_at timestamptz not null default now()
);

create index vault_entry_attachments_vault_entry_id_idx
  on public.vault_entry_attachments (knowledge_vault_entry_id);
create index vault_entry_attachments_uploaded_by_user_id_idx
  on public.vault_entry_attachments (uploaded_by_user_id);

alter table public.vault_entry_attachments enable row level security;

create policy "vault_entry_attachments_select"
  on public.vault_entry_attachments
  for select
  using (
    exists (
      select 1 from public.knowledge_vault_entries
      where knowledge_vault_entries.id = vault_entry_attachments.knowledge_vault_entry_id
        and knowledge_vault_entries.account_id = auth_account_id()
    )
  );

create policy "vault_entry_attachments_insert"
  on public.vault_entry_attachments
  for insert
  with check (
    exists (
      select 1 from public.knowledge_vault_entries
      where knowledge_vault_entries.id = vault_entry_attachments.knowledge_vault_entry_id
        and knowledge_vault_entries.account_id = auth_account_id()
    )
  );

create policy "vault_entry_attachments_delete"
  on public.vault_entry_attachments
  for delete
  using (
    exists (
      select 1 from public.knowledge_vault_entries
      where knowledge_vault_entries.id = vault_entry_attachments.knowledge_vault_entry_id
        and knowledge_vault_entries.account_id = auth_account_id()
    )
  );
