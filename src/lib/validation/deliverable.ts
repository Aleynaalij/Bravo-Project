import { z } from "zod";
import { DELIVERABLE_TYPES } from "@/lib/domain/enums";

// Structured section content every deliverable version must conform to
// (TDD §2.6) — keeps AI output formatted consistently instead of free-form
// prose. Validated before a deliverable_versions row is written.
export const deliverableSectionSchema = z.object({
  heading: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
});

// Optional architecture diagram, only requested for deliverable types in
// DIAGRAM_DELIVERABLE_TYPES (labels.ts) — a sibling to `sections`, not a
// section itself, so every other deliverable type's content shape is
// untouched. Bounds (2-14 nodes) and the id-reference check below exist
// because this is rendered into a fixed-size canvas by a plain grid
// layout (src/lib/diagram/layout.ts) with no collision handling — an
// unbounded or dangling-reference diagram would silently break that
// layout rather than fail validation with a clear error.
const architectureDiagramNodeSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  kind: z.enum(["boundary", "service", "external", "user"]),
});

const architectureDiagramEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().max(60).optional(),
});

export const architectureDiagramSchema = z
  .object({
    title: z.string().min(1).max(100),
    nodes: z.array(architectureDiagramNodeSchema).min(2).max(14),
    edges: z.array(architectureDiagramEdgeSchema).max(30),
  })
  .superRefine((diagram, ctx) => {
    const ids = new Set(diagram.nodes.map((n) => n.id));
    if (ids.size !== diagram.nodes.length) {
      ctx.addIssue({ code: "custom", message: "Diagram node ids must be unique" });
    }
    for (const edge of diagram.edges) {
      if (!ids.has(edge.from) || !ids.has(edge.to)) {
        ctx.addIssue({
          code: "custom",
          message: `Diagram edge references an unknown node id ("${edge.from}" -> "${edge.to}")`,
        });
      }
    }
  });

export const deliverableContentSchema = z.object({
  sections: z.array(deliverableSectionSchema).min(1),
  diagram: architectureDiagramSchema.optional(),
});

export type DeliverableContent = z.infer<typeof deliverableContentSchema>;

export const generateRequestSchema = z.object({
  deliverableTypes: z.array(z.enum(DELIVERABLE_TYPES)).min(1),
});

export type GenerateRequestInput = z.infer<typeof generateRequestSchema>;

export const deliverableVersionCreateSchema = z.object({
  content: deliverableContentSchema,
});

export type DeliverableVersionCreateInput = z.infer<
  typeof deliverableVersionCreateSchema
>;
