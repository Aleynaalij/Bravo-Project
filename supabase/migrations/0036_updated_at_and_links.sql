-- EKS V2 step 12/16: updated_at on the two content types that predate SOPs/
-- Playbooks (so "aging content" — no edit in 6 months — means the same
-- thing across every content type, matching the columns sops/playbooks
-- already got from their own migrations), plus two cross-reference link
-- tables for an explicit "related vault entries" multi-select on the SOP
-- and Playbook forms. This is a schema prerequisite for the Knowledge
-- dashboard tab (step 14) and the Risk tab's aging-content metric (step 16).

alter table public.knowledge_vault_entries
  add column updated_at timestamptz not null default now();
alter table public.knowledge_scripts
  add column updated_at timestamptz not null default now();

-- Explicit "related vault entries" links a SOP/Playbook author picks on the
-- form, distinct from eks_request_vault_entries (which records what
-- searchVault surfaced automatically for a troubleshoot request) — these
-- are curated, not inferred. Same "no account_id of its own, check
-- ownership via the parent row" RLS pattern as
-- deliverable_version_kb_entries_all_via_version (migration 0002) and
-- eks_request_vault_entries (migration 0034), but select/insert/delete
-- rather than append-only, since the form replaces the full set on every
-- save (delete-all-then-insert, same shape as ServicesForm's services
-- column update).
create table public.sop_vault_entry_links (
  sop_id uuid not null references public.sops(id) on delete cascade,
  knowledge_vault_entry_id uuid not null references public.knowledge_vault_entries(id) on delete cascade,
  primary key (sop_id, knowledge_vault_entry_id)
);

create index sop_vault_entry_links_vault_entry_id_idx
  on public.sop_vault_entry_links (knowledge_vault_entry_id);

alter table public.sop_vault_entry_links enable row level security;

create policy "sop_vault_entry_links_select"
  on public.sop_vault_entry_links
  for select
  using (
    exists (
      select 1 from public.sops
      where sops.id = sop_vault_entry_links.sop_id
        and sops.account_id = auth_account_id()
    )
  );

create policy "sop_vault_entry_links_insert"
  on public.sop_vault_entry_links
  for insert
  with check (
    exists (
      select 1 from public.sops
      where sops.id = sop_vault_entry_links.sop_id
        and sops.account_id = auth_account_id()
    )
  );

create policy "sop_vault_entry_links_delete"
  on public.sop_vault_entry_links
  for delete
  using (
    exists (
      select 1 from public.sops
      where sops.id = sop_vault_entry_links.sop_id
        and sops.account_id = auth_account_id()
    )
  );

create table public.playbook_vault_entry_links (
  playbook_id uuid not null references public.playbooks(id) on delete cascade,
  knowledge_vault_entry_id uuid not null references public.knowledge_vault_entries(id) on delete cascade,
  primary key (playbook_id, knowledge_vault_entry_id)
);

create index playbook_vault_entry_links_vault_entry_id_idx
  on public.playbook_vault_entry_links (knowledge_vault_entry_id);

alter table public.playbook_vault_entry_links enable row level security;

create policy "playbook_vault_entry_links_select"
  on public.playbook_vault_entry_links
  for select
  using (
    exists (
      select 1 from public.playbooks
      where playbooks.id = playbook_vault_entry_links.playbook_id
        and playbooks.account_id = auth_account_id()
    )
  );

create policy "playbook_vault_entry_links_insert"
  on public.playbook_vault_entry_links
  for insert
  with check (
    exists (
      select 1 from public.playbooks
      where playbooks.id = playbook_vault_entry_links.playbook_id
        and playbooks.account_id = auth_account_id()
    )
  );

create policy "playbook_vault_entry_links_delete"
  on public.playbook_vault_entry_links
  for delete
  using (
    exists (
      select 1 from public.playbooks
      where playbooks.id = playbook_vault_entry_links.playbook_id
        and playbooks.account_id = auth_account_id()
    )
  );
