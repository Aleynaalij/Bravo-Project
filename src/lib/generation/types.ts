import type { ServiceType } from "@/lib/domain/enums";

// Matches the jsonb shape written in supabase/migrations/0005_epic_c_seed.sql.
export interface SectionSchemaEntry {
  key: string;
  heading: string;
  always?: boolean;
  requires_service?: ServiceType;
}

export interface PromptTemplateRow {
  id: string;
  deliverable_type: string;
  version: number;
  section_schema: SectionSchemaEntry[];
  template_body: string;
}

export interface KnowledgeBaseEntryRow {
  id: string;
  title: string;
  service_type: ServiceType;
  industry: string | null;
  content: string;
  source_url: string | null;
}
