# QuePilot.ai — Database ERD (MVP)

**Status:** Draft v1
**Target DB:** Supabase Postgres (MVP) — schema deliberately avoids Postgres-only constructs beyond `jsonb`, so it ports cleanly to Azure SQL for the target architecture.

## Diagram

```mermaid
erDiagram
    ACCOUNTS ||--o{ USERS : "has members"
    ACCOUNTS ||--o{ PROJECTS : owns
    ACCOUNTS ||--o| BRANDING : has
    ACCOUNTS ||--o| SUBSCRIPTIONS : has
    ACCOUNTS ||--o{ KNOWLEDGE_VAULT_ENTRIES : "captures (private)"
    KNOWLEDGE_VAULT_ENTRIES ||--o{ VAULT_ENTRY_ATTACHMENTS : "has files"
    ACCOUNTS ||--o{ KNOWLEDGE_SCRIPTS : "captures (private)"
    ACCOUNTS ||--o{ CODING_STANDARDS : "defines (private)"
    ACCOUNTS ||--o{ AUTOMATION_REQUESTS : logs
    ACCOUNTS ||--o{ SOPS : "defines (private)"
    ACCOUNTS ||--o{ PLAYBOOKS : "defines (private)"
    ACCOUNTS ||--o{ EKS_REQUESTS : logs

    PROJECTS ||--o{ PROJECT_SERVICES : "in scope"
    PROJECTS ||--o{ DELIVERABLES : generates
    PROJECTS |o--o{ KNOWLEDGE_VAULT_ENTRIES : "sourced from (optional)"
    EKS_REQUESTS }o--o{ KNOWLEDGE_VAULT_ENTRIES : "surfaced (optional)"
    SOPS }o--o{ KNOWLEDGE_VAULT_ENTRIES : "related (optional)"
    PLAYBOOKS }o--o{ KNOWLEDGE_VAULT_ENTRIES : "related (optional)"
    KNOWLEDGE_SCRIPTS }o--o{ KNOWLEDGE_VAULT_ENTRIES : "related (optional)"

    DELIVERABLES ||--o{ DELIVERABLE_VERSIONS : "has versions"
    DELIVERABLE_VERSIONS }o--o{ KNOWLEDGE_BASE_ENTRIES : references
    DELIVERABLES }o--|| PROMPT_TEMPLATES : "uses (latest)"

    ACCOUNTS {
        uuid id PK
        text email
        text firm_name
        text plan
        timestamptz created_at
    }

    USERS {
        uuid id PK
        uuid account_id FK
        text email
        text role
        timestamptz created_at
    }

    BRANDING {
        uuid account_id PK_FK
        text logo_url
        text primary_color
        text firm_name_override
    }

    SUBSCRIPTIONS {
        uuid account_id PK_FK
        text stripe_customer_id
        text stripe_subscription_id
        text status
        text plan
        timestamptz current_period_end
    }

    PROJECTS {
        uuid id PK
        uuid account_id FK
        text customer_name
        text industry
        int user_count
        text licensing_tier
        text[] geographic_locations
        text compliance_notes
        text status
        timestamptz closed_at
        timestamptz created_at
        timestamptz updated_at
    }

    PROJECT_SERVICES {
        uuid project_id PK_FK
        text service_type PK
    }

    DELIVERABLES {
        uuid id PK
        uuid project_id FK
        text type
        uuid current_version_id FK
        text status
        timestamptz created_at
    }

    DELIVERABLE_VERSIONS {
        uuid id PK
        uuid deliverable_id FK
        int version_number
        text source
        jsonb content
        text prompt_template_version
        timestamptz created_at
    }

    DELIVERABLE_VERSION_KB_ENTRIES {
        uuid deliverable_version_id PK_FK
        uuid knowledge_base_entry_id PK_FK
    }

    KNOWLEDGE_BASE_ENTRIES {
        uuid id PK
        text title
        text service_type
        text industry
        text content
        text source_url
        int version
        timestamptz created_at
    }

    PROMPT_TEMPLATES {
        uuid id PK
        text deliverable_type
        int version
        jsonb section_schema
        text template_body
        boolean is_active
        timestamptz created_at
    }

    GENERATION_JOBS {
        uuid id PK
        uuid project_id FK
        text deliverable_type
        text status
        uuid result_deliverable_id FK
        text error_message
        timestamptz created_at
        timestamptz completed_at
    }

    KNOWLEDGE_VAULT_ENTRIES {
        uuid id PK
        uuid account_id FK
        text entry_type
        text title
        text service_type
        uuid project_id FK
        uuid author_user_id FK
        text[] tags
        text customer_size
        vector embedding
        int version
        timestamptz updated_at
        timestamptz created_at
    }

    VAULT_ENTRY_ATTACHMENTS {
        uuid id PK
        uuid knowledge_vault_entry_id FK
        text storage_path
        text file_name
        text content_type
        bigint size_bytes
        uuid uploaded_by_user_id FK
        text uploaded_by_email
        timestamptz created_at
    }

    KNOWLEDGE_SCRIPTS {
        uuid id PK
        uuid account_id FK
        text name
        text script_type
        text risk_level
        uuid author_user_id FK
        text[] tags
        vector embedding
        int version
        boolean is_approved_pattern
        text source
        timestamptz updated_at
        timestamptz created_at
    }

    CODING_STANDARDS {
        uuid id PK
        uuid account_id FK
        text script_type
        text[] required_elements
        text notes
        uuid author_user_id FK
        text author_email
        int version
        timestamptz created_at
    }

    AUTOMATION_REQUESTS {
        uuid id PK
        uuid account_id FK
        uuid user_id FK
        text user_email
        text feature
        text script_type
        text environment_profile
        text input
        jsonb output
        text error_message
        timestamptz created_at
    }

    SOPS {
        uuid id PK
        uuid account_id FK
        text sop_type
        text title
        text service_type
        text status
        jsonb content
        text prompt_template_version
        uuid author_user_id FK
        text author_email
        uuid source_project_id FK
        vector embedding
        timestamptz updated_at
        int version
        timestamptz created_at
    }

    PLAYBOOKS {
        uuid id PK
        uuid account_id FK
        text playbook_type
        text title
        text service_type
        text status
        jsonb content
        text prompt_template_version
        uuid author_user_id FK
        text author_email
        uuid source_project_id FK
        timestamptz updated_at
        int version
        timestamptz created_at
    }

    EKS_REQUESTS {
        uuid id PK
        uuid account_id FK
        uuid user_id FK
        text user_email
        text feature
        uuid project_id FK
        jsonb input
        jsonb output
        text error_message
        timestamptz created_at
    }

    EKS_REQUEST_VAULT_ENTRIES {
        uuid eks_request_id PK_FK
        uuid knowledge_vault_entry_id PK_FK
    }

    SOP_VAULT_ENTRY_LINKS {
        uuid sop_id PK_FK
        uuid knowledge_vault_entry_id PK_FK
    }

    PLAYBOOK_VAULT_ENTRY_LINKS {
        uuid playbook_id PK_FK
        uuid knowledge_vault_entry_id PK_FK
    }

    SCRIPT_VAULT_ENTRY_LINKS {
        uuid script_id PK_FK
        uuid knowledge_vault_entry_id PK_FK
    }
```

*(`DELIVERABLE_VERSIONS }o--o{ KNOWLEDGE_BASE_ENTRIES` is realized via the join table `DELIVERABLE_VERSION_KB_ENTRIES`.)*

## Table Notes

### accounts
One row per paying customer (an individual consultant, or later a firm/MSP with multiple seats). `plan` is denormalized here for quick checks; source of truth for billing state is `subscriptions`.

### users
Individual login identities. No longer 1:1 with account — multi-seat shipped (migration 0017) exactly the way this table was designed to allow: relaxing the assumption in application logic (an auth-trigger branch, new RLS policy, an invite flow) with no schema migration to the table's shape itself, only a `role` check constraint (`'owner' | 'member'`). Every account-scoped RLS policy already keyed off `auth_account_id()` rather than a specific user id, so a second `users` row under the same `account_id` gets full data access for free; `role` only gates account-level actions (team management, billing, account deletion) at the application layer, not project/deliverable access.

### branding
1:1 with account. Used to stamp exported DOCX/PDF deliverables with the consultant's/firm's own branding rather than QuePilot's.

### subscriptions
1:1 with account. Mirrors Stripe subscription state; updated via Stripe webhook handler.

### projects
The intake record for one customer engagement. Maps directly to PRD §6.1 and OpenAPI `Project` schema. `status`/`closed_at` (migration 0031, Expert Knowledge System Phase 2) implement the "no project should be closed without knowledge capture" gate — closing requires at least one linked `knowledge_vault_entries` row (`hasVaultEntryForProject`) and makes the project read-only (no new `generation_jobs`, no `project_services` edits) rather than just a status label.

### project_services
Join table for the many-to-many between a project and the fixed `ServiceType` enum (DLP, Retention, Sensitivity Labels, etc.). Modeled as a table (not an array column) so future service-specific metadata (e.g., a DLP policy count) has somewhere to attach.

### deliverables
One row per (project, deliverable type) — e.g., a project has at most one "Statement of Work" deliverable, which accumulates versions over time. `current_version_id` is a denormalized pointer to the latest `deliverable_versions` row for fast reads.

### deliverable_versions
Append-only version history per deliverable (PRD FR-6). `source` distinguishes `ai_generated` from `consultant_edited` versions. `content` is `jsonb` matching the section schema defined by the deliverable type's active `prompt_templates` row — validated with Zod at the API layer before insert.

### deliverable_version_kb_entries
Join table recording exactly which Knowledge Base entries were used to generate a given version — supports the auditability requirement in TDD §6 (trace generated content back to its source reference).

### knowledge_base_entries
Admin-curated reference content, tagged by `service_type` and `industry`, retrieved by simple filtered query at MVP (see TDD §2.5 — vector search via `pgvector` is a Phase 2 candidate once the KB is large enough to need semantic retrieval).

### prompt_templates
Versioned prompt templates per deliverable type. Only one version `is_active` per `deliverable_type` at a time; keeping history here (rather than in application code) is what makes `deliverable_versions.prompt_template_version` a meaningful audit trail.

### generation_jobs
Tracks async generation requests (OpenAPI `GenerationJob`). On success, `result_deliverable_id` points at the `deliverables` row that was created/updated; on failure, `error_message` is surfaced to the client.

### knowledge_vault_entries
Account-private institutional memory (TDD §2.10, Expert Knowledge System MVP) — one consulting team's own lessons learned and incidents, unified into one table via the `entry_type` discriminator (`'lesson_learned' | 'incident'`) rather than two near-duplicate tables, the same convention `generation_jobs` uses for its `deliverable_type` column. `project_id` optionally links back to the source engagement (`on delete set null` — the entry outlives the project). `author_user_id` is nullable (`on delete set null`) with `author_email` denormalized alongside it, same rationale as `audit_log.actor_email`: the entry stays attributable even after the author's `users` row is gone. `embedding`/`version` follow the same shape as `knowledge_base_entries`. `updated_at` (migration 0036, EKS V2 step 12 — retrofitted here since `sops`/`playbooks` had it from day one) is bumped on every `updateVaultEntry` call so "aging content" means the same last-edited timestamp across every content type. `customer_size` (migration 0037, Module 1 gap-closure — `'small' | 'mid_market' | 'enterprise'`) is a fixed bracket rather than free text, closing one of the three gaps the original Lessons Learned Vault module brief called out (customer size, cross-references to scripts/SOPs/playbooks, attachments). **Not** platform-admin readable — see Row-Level Security below.

### knowledge_scripts
Account-private reusable script library (TDD §2.10) — PowerShell, Graph API, KQL, JSON, Terraform, Bicep, or ARM template snippets a team has actually used and wants to reuse, with a `risk_level` self-rating. Same account-ownership, authorship, and embedding/versioning shape as `knowledge_vault_entries`; a separate table rather than another `entry_type` value because a script's fields (`content`, `risk_level`, `dependencies`, `rollback_steps`) don't meaningfully overlap with a narrative entry's. `is_approved_pattern`/`source` (migration 0029, additive) support the Automation Center (TDD §2.11): `is_approved_pattern` is the "Approved Patterns" vetted-template flag; `source` (`'manual' | 'ai_generated' | 'promoted'`, default `'manual'`) distinguishes a hand-entered script from one Code Creator generated and the author promoted into the vault. `updated_at` (migration 0036) mirrors `knowledge_vault_entries`', bumped by `updateVaultScript`.

### coding_standards
Account-private "how WE write PowerShell" templates (TDD §2.11) — one row per `(account_id, script_type)`, `required_elements text[]` as the checklist Code Auditor grades against and Code Creator generates to satisfy, plus freeform `notes`. Same account-ownership/RLS shape as `knowledge_vault_entries`, no embedding (these aren't semantically searched, only looked up by exact script type via `getCodingStandardByScriptType`). `version` bumps on every edit, same convention as `knowledge_scripts`.

### automation_requests
Append-only log of every Code Auditor/Code Creator call (TDD §2.11) — `feature` discriminates `'code_audit' | 'code_generate'`, `input` holds the pasted code (audit) or a JSON-serialized requirements object (creator), `output` holds the validated AI response, `error_message` is set instead when the call or its validation failed. Doubles as the source for `assertUnderAutomationRateLimit`'s daily counter, the same dual role `generation_jobs` plays for deliverable generation's own rate limit.

### sops
Account-private SOP library (Expert Knowledge System Phase 2, migration 0032) — a firm's own standard operating procedures (daily operations, DLP administration, label management, retention, etc.), not scoped to any one project. Same ownership/RLS shape as `knowledge_vault_entries`/`coding_standards`: `account_id = auth_account_id()`, all four verbs, no platform-admin override. `content` is `jsonb` shaped exactly like `deliverable_versions.content` (`{sections:[{heading,paragraphs}]}`), Zod-validated against a fixed 12-heading structure common to every `sop_type` (Purpose, Scope, Roles, Responsibilities, Prerequisites, Procedure, Validation, Exception Handling, Reporting, Escalation, References, Revision History) — this migration ships manual entry only; AI generation (`src/lib/sop/generate.ts`, sharing `generateStructuredDoc()` with playbooks, landed in step 3) and semantic search (`embedding vector(1536)` + `match_sops` RPC, migration 0035, step 11) land in later steps of the same phase — `src/lib/sop/search.ts`'s `searchSops()` falls back to a text-filtered query when no AI provider is configured, same shape as `vault/search.ts`'s own fallback. Playbooks deliberately don't get a matching `embedding` column in this phase; `searchPlaybooks()` is text-filtered only. `source_project_id` optionally links back to the engagement that prompted writing it (`on delete set null`, same "outlives the project" rationale as `knowledge_vault_entries.project_id`) without scoping visibility — `account_id` does that. `updated_at` exists from day one (unlike `knowledge_vault_entries`/`knowledge_scripts`, retrofitted in a later step) since `updateSop` already needs a last-edited timestamp.

### playbooks
Account-private playbook library (Expert Knowledge System Phase 2, migration 0033) — a firm's own deployment/rollout playbooks (DLP deployment, records management, insider risk, communication compliance, eDiscovery, information protection). Identical shape and rationale to `sops` in every respect (ownership/RLS, `content` jsonb, manual-entry-first sequencing, `source_project_id`, day-one `updated_at`) — the only difference is `playbook_type`'s six values and the fixed 12-heading structure a playbook follows (Discovery, Requirements, Planning, Design, Implementation, Testing, Pilot, Rollout, Monitoring, Operations, Success Criteria, Lessons Learned), which walks a deployment project through phases rather than documenting a repeatable operational procedure like an SOP's headings do.

### eks_requests
Shared request log (Expert Knowledge System Phase 2, migration 0034) for the EKS reasoning-layer family — Troubleshooting Engine and Architecture Advisor (`feature` discriminates the two). Deliberately not a widened `automation_requests`: EKS reasoning calls optionally link back to a `project_id` and cross-reference Knowledge Vault entries, a usage pattern `automation_requests` doesn't have, so this gets its own table and its own rate limit (`src/lib/eks/rate-limit.ts`) rather than sharing either `automation_requests`' or `generation_jobs`' budget. Same account-scoped RLS shape as `automation_requests` — see the RLS section below for a real bug (migration 0042) found and fixed in both tables' policies.

### eks_request_vault_entries
Join table recording exactly which `knowledge_vault_entries` rows `searchVault` surfaced as "similar historical issues" for a given `eks_requests` row — mirrors `deliverable_version_kb_entries` exactly, including its RLS shape (ownership checked via the parent `eks_requests` row, since this table has no `account_id` of its own). This is what a later "most cross-referenced content" dashboard metric reads from.

### vault_entry_attachments (+ `vault-attachments` storage bucket)
Small-file attachments on a Lessons Learned Vault entry (migration 0039, Module 1 gap-closure 3/3) — screenshots, logs, or small documents that support an entry, not a second copy of generated deliverables (that's FileVault's job, and it deliberately doesn't add its own Storage either). This is the first real Supabase Storage usage anywhere in the app; no such infrastructure existed before this migration. `vault-attachments` is a **private** bucket — every read goes through a freshly-minted `createSignedUrl` (1 hour expiry) at render time, never a stored public URL. Objects are written at `{account_id}/{knowledge_vault_entry_id}/{uuid}-{filename}`, with `account_id` set server-side from the authenticated session (never taken from user input) so the path itself carries the RLS boundary. `storage.objects` gets 3 policies (select/insert/delete, `to authenticated`) checking `bucket_id = 'vault-attachments' and (storage.foldername(name))[1] = auth_account_id()::text`. The `vault_entry_attachments` table holds the metadata Storage itself doesn't (`file_name`, `content_type`, `size_bytes`, uploader) with its own 3-verb (no update — an attachment is replaced by delete+reupload, not edited) RLS via an `exists` subquery against `knowledge_vault_entries.account_id = auth_account_id()`, the same ownership-via-parent-row pattern as the `*_vault_entry_links` tables below. Capped in the application layer, not the schema: 5 attachments per entry, 10MB each, content-type whitelisted to images/text/CSV/PDF/zip/Office docs — deliberately excludes executables/scripts, since that's Script Vault's job, not this feature's.

### sop_vault_entry_links / playbook_vault_entry_links / script_vault_entry_links
Join tables (migration 0036, EKS V2 step 12; `script_vault_entry_links` added in migration 0038, Module 1 gap-closure) recording the "related vault entries" an author explicitly picks on the SOP/Playbook/Script form — curated, unlike `eks_request_vault_entries`' automatically-surfaced rows. Same no-`account_id`, ownership-via-parent-row RLS shape, but select/insert/**delete** (not append-only): `setSopVaultEntryLinks`/`setPlaybookVaultEntryLinks`/`setScriptVaultEntryLinks` replace the full link set on every save (delete-all-then-insert), the same full-replace shape `updateServicesAction` already uses for a project's `project_services`. Feeds the Knowledge dashboard tab's cross-reference count (step 14) and a vault entry's own "Referenced by" section (`getVaultEntryReferences`, the reverse-direction read across all three tables).

## Row-Level Security (Supabase)

Every account-scoped table (`projects`, `deliverables`, `deliverable_versions`, `generation_jobs`, `branding`, `subscriptions`) has an RLS policy restricting rows to `account_id = auth.uid()`'s owning account (via `users.account_id`). `knowledge_base_entries` and `prompt_templates` are platform-managed (admin-write, authenticated-read) rather than account-scoped.

`knowledge_vault_entries` and `knowledge_scripts` are also account-scoped (`account_id = auth_account_id()`, all four verbs), but deliberately **without** the platform-admin read override that exists elsewhere in the schema (e.g. `is_platform_admin()` gating admin routes) — this is private per-account institutional memory, not platform-managed content, so QuePilot staff get no special read access to it. Their `match_knowledge_vault_entries`/`match_knowledge_scripts` search RPCs are `security invoker` rather than `security definer` for the same reason: they run as the calling user and inherit this RLS automatically.

`coding_standards` follows the identical private, no-admin-override, all-four-verbs pattern. `automation_requests` is account-scoped, select/insert/**update** (no delete) — originally shipped select-plus-insert-only on the (wrong) assumption that it was a purely append-only call log like `audit_log`, but `runCodeCreator`/`runCodeAudit` both insert a row up front and then update it with `output`/`error_message` once the AI call settles, so that original policy set silently no-op'd every one of those updates under RLS (real bug, found investigating a Code Creator timeout, fixed by migration 0042's `automation_requests_update` policy). No delete policy — a request's history isn't user-removable.

`sops` and `playbooks` both follow the identical private, no-admin-override, all-four-verbs pattern (`sops_select/insert/update/delete`, `playbooks_select/insert/update/delete`).

`eks_requests` is account-scoped, select/insert/**update** (no delete) — same bug and same migration 0042 fix as `automation_requests`, since `runTroubleshoot`/`runArchitectureAdvisor` follow the identical insert-then-update-with-output pattern. `eks_request_vault_entries` has no `account_id` column of its own — its select/insert policies check ownership via an `exists` subquery against the parent `eks_requests` row, the same pattern `deliverable_version_kb_entries_all_via_version` (migration 0002) uses to check ownership through `deliverable_versions` → `deliverables` → `projects`.

`sop_vault_entry_links`/`playbook_vault_entry_links` (migration 0036) and `script_vault_entry_links` (migration 0038) use the identical ownership-via-parent-row pattern (checked against `sops`/`playbooks`/`knowledge_scripts` respectively), but add a **delete** policy alongside select/insert since these links are user-curated and get replaced wholesale on every form save, unlike the append-only join tables above.

`vault_entry_attachments` (migration 0039) uses the same ownership-via-parent-row pattern (checked against `knowledge_vault_entries.account_id`), with select/insert/delete but no update. `storage.objects` on the `vault-attachments` bucket is scoped the same way, but via a path-prefix check (`(storage.foldername(name))[1] = auth_account_id()::text`) rather than a subquery, since Storage RLS has no join back to an application table — the account id has to live in the object path itself.

## Indexes (MVP-critical)

- `projects(account_id)`
- `deliverables(project_id)`
- `deliverable_versions(deliverable_id, version_number desc)`
- `knowledge_base_entries(service_type, industry)`
- `generation_jobs(project_id, status)`
- `knowledge_vault_entries(account_id)`, `knowledge_vault_entries(account_id, entry_type)`, GIN on `tags`, HNSW on `embedding`
- `knowledge_scripts(account_id)`, GIN on `tags`, HNSW on `embedding`
- `coding_standards(account_id)`, unique on `(account_id, script_type)`
- `automation_requests(account_id, created_at desc)`, `automation_requests(user_id)`
- `sops(account_id)`, `sops(account_id, sop_type)`, `sops(author_user_id)`, `sops(source_project_id)`, HNSW on `sops(embedding)`
- `playbooks(account_id)`, `playbooks(account_id, playbook_type)`, `playbooks(author_user_id)`, `playbooks(source_project_id)`
- `eks_requests(account_id, created_at desc)`, `eks_requests(user_id)`, `eks_requests(project_id)`, `eks_request_vault_entries(knowledge_vault_entry_id)`
- `sop_vault_entry_links(knowledge_vault_entry_id)`, `playbook_vault_entry_links(knowledge_vault_entry_id)`, `script_vault_entry_links(knowledge_vault_entry_id)`
- `vault_entry_attachments(knowledge_vault_entry_id)`, `vault_entry_attachments(uploaded_by_user_id)`
