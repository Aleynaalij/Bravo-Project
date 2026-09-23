-- Engagement Assistant (Expert Knowledge System, original Module 8) — the
-- locked-in roadmap (docs/TDD.md §7) flags this as "still partial": the
-- existing deliverable catalog already covers most of engagement work
-- (Executive Summary, SOW, HLD, etc.) but has no discovery questionnaire,
-- risk register, or a deck-shaped client presentation. All three fit the
-- existing generic deliverable pipeline (content is still {sections:
-- [{heading, paragraphs}]}, exported through the same DOCX/PDF/PPTX
-- builders) — this is a catalog addition, not a new subsystem.
--
-- Enum-add-then-use must be separate migrations/transactions (Postgres
-- restriction, same as every prior catalog expansion, e.g. 0013/0015) —
-- this migration only adds enum values; 0041 adds the prompt templates
-- that use them.

alter type deliverable_type add value 'discovery_questionnaire';
alter type deliverable_type add value 'risk_register';
alter type deliverable_type add value 'client_presentation';
