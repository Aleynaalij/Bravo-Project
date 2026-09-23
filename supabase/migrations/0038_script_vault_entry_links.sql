-- Module 1 (Lessons Learned Vault) gap-closure, part 2/3: the originating
-- brief asked for links from a vault entry to its related scripts, the
-- one content type migration 0036's sop_vault_entry_links/
-- playbook_vault_entry_links pair didn't cover — a script's own form now
-- gets the same "related vault entries" curated multi-select SOPs and
-- playbooks already have, and this table is what a vault entry's own
-- page later reads (together with the two existing link tables) to show
-- everything that references it. Exact same shape, RLS included, as
-- sop_vault_entry_links (migration 0036) — see that migration's own
-- comment for the full rationale (curated, not automatic; select/insert/
-- delete rather than append-only, since the form replaces the full set on
-- every save).
create table public.script_vault_entry_links (
  script_id uuid not null references public.knowledge_scripts(id) on delete cascade,
  knowledge_vault_entry_id uuid not null references public.knowledge_vault_entries(id) on delete cascade,
  primary key (script_id, knowledge_vault_entry_id)
);

create index script_vault_entry_links_vault_entry_id_idx
  on public.script_vault_entry_links (knowledge_vault_entry_id);

alter table public.script_vault_entry_links enable row level security;

create policy "script_vault_entry_links_select"
  on public.script_vault_entry_links
  for select
  using (
    exists (
      select 1 from public.knowledge_scripts
      where knowledge_scripts.id = script_vault_entry_links.script_id
        and knowledge_scripts.account_id = auth_account_id()
    )
  );

create policy "script_vault_entry_links_insert"
  on public.script_vault_entry_links
  for insert
  with check (
    exists (
      select 1 from public.knowledge_scripts
      where knowledge_scripts.id = script_vault_entry_links.script_id
        and knowledge_scripts.account_id = auth_account_id()
    )
  );

create policy "script_vault_entry_links_delete"
  on public.script_vault_entry_links
  for delete
  using (
    exists (
      select 1 from public.knowledge_scripts
      where knowledge_scripts.id = script_vault_entry_links.script_id
        and knowledge_scripts.account_id = auth_account_id()
    )
  );
