# BravoPilot.ai — Database ERD (MVP)

**Status:** Draft v1
**Target DB:** Supabase Postgres (MVP) — schema deliberately avoids Postgres-only constructs beyond `jsonb`, so it ports cleanly to Azure SQL for the target architecture.

## Diagram

```mermaid
erDiagram
    ACCOUNTS ||--o{ USERS : "has members"
    ACCOUNTS ||--o{ PROJECTS : owns
    ACCOUNTS ||--o| BRANDING : has
    ACCOUNTS ||--o| SUBSCRIPTIONS : has

    PROJECTS ||--o{ PROJECT_SERVICES : "in scope"
    PROJECTS ||--o{ DELIVERABLES : generates

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
```

*(`DELIVERABLE_VERSIONS }o--o{ KNOWLEDGE_BASE_ENTRIES` is realized via the join table `DELIVERABLE_VERSION_KB_ENTRIES`.)*

## Table Notes

### accounts
One row per paying customer (an individual consultant, or later a firm/MSP with multiple seats). `plan` is denormalized here for quick checks; source of truth for billing state is `subscriptions`.

### users
Individual login identities. No longer 1:1 with account — multi-seat shipped (migration 0017) exactly the way this table was designed to allow: relaxing the assumption in application logic (an auth-trigger branch, new RLS policy, an invite flow) with no schema migration to the table's shape itself, only a `role` check constraint (`'owner' | 'member'`). Every account-scoped RLS policy already keyed off `auth_account_id()` rather than a specific user id, so a second `users` row under the same `account_id` gets full data access for free; `role` only gates account-level actions (team management, billing, account deletion) at the application layer, not project/deliverable access.

### branding
1:1 with account. Used to stamp exported DOCX/PDF deliverables with the consultant's/firm's own branding rather than BravoPilot's.

### subscriptions
1:1 with account. Mirrors Stripe subscription state; updated via Stripe webhook handler.

### projects
The intake record for one customer engagement. Maps directly to PRD §6.1 and OpenAPI `Project` schema.

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

## Row-Level Security (Supabase)

Every account-scoped table (`projects`, `deliverables`, `deliverable_versions`, `generation_jobs`, `branding`, `subscriptions`) has an RLS policy restricting rows to `account_id = auth.uid()`'s owning account (via `users.account_id`). `knowledge_base_entries` and `prompt_templates` are platform-managed (admin-write, authenticated-read) rather than account-scoped.

## Indexes (MVP-critical)

- `projects(account_id)`
- `deliverables(project_id)`
- `deliverable_versions(deliverable_id, version_number desc)`
- `knowledge_base_entries(service_type, industry)`
- `generation_jobs(project_id, status)`
