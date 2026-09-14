import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliverableType, ServiceType } from "@/lib/domain/enums";
import { getProject } from "@/lib/projects/service";
import { deliverableContentSchema } from "@/lib/validation/deliverable";
import { generateCompletion } from "@/lib/ai/provider";
import { getRelevantKnowledgeBaseEntries } from "./knowledge-base";
import { assemblePrompt } from "./prompt";
import type { PromptTemplateRow } from "./types";

export class GenerationError extends Error {}

async function getActiveTemplate(
  supabase: SupabaseClient,
  deliverableType: DeliverableType,
): Promise<PromptTemplateRow> {
  const { data, error } = await supabase
    .from("prompt_templates")
    .select("id, deliverable_type, version, section_schema, template_body")
    .eq("deliverable_type", deliverableType)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new GenerationError(`No active prompt template for ${deliverableType}`);
  }
  return data;
}

async function upsertDeliverable(
  supabase: SupabaseClient,
  projectId: string,
  deliverableType: DeliverableType,
): Promise<string> {
  const { data: existing, error: selectError } = await supabase
    .from("deliverables")
    .select("id")
    .eq("project_id", projectId)
    .eq("type", deliverableType)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    await supabase
      .from("deliverables")
      .update({ status: "generating" })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("deliverables")
    .insert({ project_id: projectId, type: deliverableType, status: "generating" })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}

// Runs one deliverable's generation end to end: assemble prompt, call the
// AI provider, validate the structured output, and persist a new
// deliverable_versions row. Called synchronously from the generate Route
// Handler / Server Action — see docs/TDD.md §2.5 for why this can grow into
// a real queue later without changing this function's contract.
export async function runGeneration(
  supabase: SupabaseClient,
  projectId: string,
  deliverableType: DeliverableType,
): Promise<{ deliverableId: string; versionId: string }> {
  const project = await getProject(supabase, projectId);
  if (!project) throw new GenerationError("Project not found");
  if (project.services.length === 0) {
    throw new GenerationError("Select at least one service in scope before generating");
  }

  const deliverableId = await upsertDeliverable(supabase, projectId, deliverableType);

  try {
    const template = await getActiveTemplate(supabase, deliverableType);
    const services = project.services as ServiceType[];
    const kbEntries = await getRelevantKnowledgeBaseEntries(supabase, services, project.industry);
    const prompt = assemblePrompt(template, project, services, kbEntries);

    const raw = await generateCompletion(prompt);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new GenerationError("AI response was not valid JSON");
    }

    const validated = deliverableContentSchema.safeParse(parsedJson);
    if (!validated.success) {
      throw new GenerationError(
        `AI response did not match the expected section schema: ${validated.error.message}`,
      );
    }

    const { data: nextVersionRow } = await supabase
      .from("deliverable_versions")
      .select("version_number")
      .eq("deliverable_id", deliverableId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersionNumber = (nextVersionRow?.version_number ?? 0) + 1;

    const { data: version, error: versionError } = await supabase
      .from("deliverable_versions")
      .insert({
        deliverable_id: deliverableId,
        version_number: nextVersionNumber,
        source: "ai_generated",
        content: validated.data,
        prompt_template_version: `${template.deliverable_type}:v${template.version}`,
      })
      .select("id")
      .single();
    if (versionError) throw versionError;

    if (kbEntries.length > 0) {
      await supabase.from("deliverable_version_kb_entries").insert(
        kbEntries.map((entry) => ({
          deliverable_version_id: version.id,
          knowledge_base_entry_id: entry.id,
        })),
      );
    }

    await supabase
      .from("deliverables")
      .update({ status: "ready", current_version_id: version.id })
      .eq("id", deliverableId);

    return { deliverableId, versionId: version.id };
  } catch (err) {
    await supabase.from("deliverables").update({ status: "failed" }).eq("id", deliverableId);
    throw err;
  }
}
