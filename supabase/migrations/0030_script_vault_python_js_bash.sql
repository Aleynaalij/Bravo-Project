-- Script Vault originally shipped supporting 7 script types (migration
-- 0027) but the Automation Center brief this feature was built from
-- explicitly asked for Python, JavaScript, and Bash too — an oversight
-- caught after the fact, not a deliberate scope cut. Widens the existing
-- CHECK constraint on knowledge_scripts.script_type; no data migration
-- needed since this only adds new allowed values, it never removes one.
alter table public.knowledge_scripts
  drop constraint knowledge_scripts_script_type_check;

alter table public.knowledge_scripts
  add constraint knowledge_scripts_script_type_check
  check (script_type in
    ('powershell', 'graph_api', 'kql', 'json', 'terraform', 'bicep', 'arm_template',
     'python', 'javascript', 'bash'));
