-- Module 1 (Lessons Learned Vault) gap-closure, part 1/3: the originating
-- brief asked for a customer-size dimension on captured entries so a
-- consultant can filter "what worked for a small client" vs. "what a
-- large enterprise needed" — this app had no existing customer-size
-- concept anywhere (projects.user_count is a project's in-scope user
-- count, not a company-size bracket). A small fixed enum, same
-- lightweight-bracket shape as every other closed categorical column in
-- this schema (script_risk_level, vault severity), not a free-text field
-- that would fragment into inconsistent values across entries.
alter table public.knowledge_vault_entries
  add column customer_size text check (customer_size in ('small', 'mid_market', 'enterprise'));
