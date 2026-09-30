"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects/service";
import { inventorySchema } from "@/lib/purview/discovery";

const cloud = z.enum(["unknown", "commercial", "gcc", "gcc_high", "dod", "other"]);
const profileSchema = z.object({
  cloud,
  tenantLabel: z.string().trim().max(120),
  currentState: z.string().trim().max(4000),
  targetState: z.string().trim().max(4000),
  licensingNotes: z.string().trim().max(2000),
  constraints: z.string().trim().max(2000),
});
const itemSchema = z.object({
  kind: z.enum(["task", "risk", "decision", "milestone", "evidence"]),
  workstream: z.enum(["dlp", "retention", "labels", "ediscovery", "other"]),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000),
  ownerName: z.string().trim().max(120),
  dueDate: z.union([z.iso.date(), z.literal("")]),
  evidenceUrl: z.union([z.url().startsWith("https://").max(1000), z.literal("")]),
});

async function activeProject(projectId: string) {
  const supabase = await createClient();
  const project = await getProject(supabase, projectId);
  if (!project || project.status === "closed") return null;
  return supabase;
}

export async function savePurviewProfile(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const supabase = await activeProject(projectId);
  if (!supabase) return;
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const p = parsed.data;
  const { error } = await supabase.from("purview_project_profiles").upsert({
    project_id: projectId, cloud: p.cloud, tenant_label: p.tenantLabel,
    current_state: p.currentState, target_state: p.targetState,
    licensing_notes: p.licensingNotes, constraints: p.constraints,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  revalidatePath(`/dashboard/${projectId}/purview`);
}

export async function addPurviewItem(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const supabase = await activeProject(projectId);
  if (!supabase) return;
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const p = parsed.data;
  const { error } = await supabase.from("purview_work_items").insert({
    project_id: projectId, kind: p.kind, workstream: p.workstream, title: p.title,
    description: p.description, owner_name: p.ownerName,
    due_date: p.dueDate || null, evidence_url: p.evidenceUrl || null,
  });
  if (error) throw error;
  revalidatePath(`/dashboard/${projectId}/purview`);
}

export async function updatePurviewItem(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const supabase = await activeProject(projectId);
  if (!supabase) return;
  const status = z.enum(["todo", "in_progress", "blocked", "done"]).safeParse(formData.get("status"));
  const id = z.uuid().safeParse(formData.get("itemId"));
  if (!status.success || !id.success) return;
  const { error } = await supabase.from("purview_work_items")
    .update({ status: status.data, updated_at: new Date().toISOString() })
    .eq("id", id.data).eq("project_id", projectId);
  if (error) throw error;
  revalidatePath(`/dashboard/${projectId}/purview`);
}

export async function importDiscoverySnapshot(_state: { message: string }, formData: FormData): Promise<{ message: string }> {
  const projectId = String(formData.get("projectId") ?? "");
  const supabase = await activeProject(projectId);
  if (!supabase) return { message: "Project unavailable or closed." };
  if (formData.get("authorized") !== "yes") return { message: "Confirm authorization before importing." };
  const permissionReference = z.string().trim().min(5).max(240).safeParse(formData.get("permissionReference"));
  const raw = String(formData.get("inventory") ?? "");
  if (!permissionReference.success || raw.length > 4000) return { message: "Provide a valid authorization reference and a small inventory." };
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return { message: "Inventory must be valid JSON." }; }
  const parsed = inventorySchema.safeParse(json);
  if (!parsed.success) return { message: "Inventory does not match the aggregate-count template. Remove extra fields and check the values." };
  const p = parsed.data;
  const { error } = await supabase.from("purview_discovery_snapshots").insert({
    project_id: projectId, cloud: p.cloud, tenant_label: p.tenantLabel,
    captured_at: p.capturedAt, permission_reference: permissionReference.data,
    inventory: p,
  });
  if (error) throw error;
  revalidatePath(`/dashboard/${projectId}/purview`);
  return { message: "Snapshot imported." };
}
