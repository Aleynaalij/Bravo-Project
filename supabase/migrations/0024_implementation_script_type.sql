-- "Can the product generate the things it's guiding in documents, not
-- just describe them?" — adds a new deliverable type that outputs actual
-- runnable PowerShell/Security & Compliance PowerShell script content
-- (DLP, retention, sensitivity labels), not prose describing what to
-- configure. Deliberately stops short of live tenant automation: a
-- consultant reviews and runs the script themselves — no OAuth app
-- registration, no write access to any customer's real Microsoft 365
-- tenant. See docs/validation-checklist.md for the full scoping
-- rationale (why PowerShell/Security & Compliance PowerShell was chosen
-- over raw Graph API calls for DLP/retention/labels specifically).
--
-- Enum-add-then-use must be separate migrations/transactions (Postgres
-- restriction, same as every prior catalog expansion) — this migration
-- only adds the enum value; 0025 adds the prompt template that uses it.

alter type deliverable_type add value 'implementation_script';
