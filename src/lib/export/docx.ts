import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  ImageRun,
  ShadingType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import type { DeliverableContent } from "@/lib/validation/deliverable";
import type { DeliverableType } from "@/lib/domain/enums";
import { DELIVERABLE_LABELS, isCodeDeliverable, supportsArchitectureDiagram } from "@/lib/domain/labels";
import type { BrandingInfo } from "@/lib/branding";
import { resolveAccentColor } from "@/lib/branding";
import { fetchLogoAsset } from "./logo";
import type { ArchitectureDiagram } from "@/lib/diagram/layout";

const DIAGRAM_KIND_LABELS: Record<ArchitectureDiagram["nodes"][number]["kind"], string> = {
  boundary: "Tenant / Boundary",
  service: "Service",
  external: "External System",
  user: "User Population",
};

// docx has no supported freeform shape-canvas API (only a low-level,
// largely undocumented DrawingML group/shape run) — building a real
// box-and-arrow diagram on it isn't worth the risk of shipping malformed
// XML nobody can visually verify here. PDF/PPTX get real vector diagrams
// (react-pdf's <Svg> primitives, pptxgenjs's native addShape); DOCX gets
// the same data as a components table + a connections list instead, which
// is an honest, still-useful representation rather than a fake picture.
function buildDiagramBlock(diagram: ArchitectureDiagram, accentColor: string): (Paragraph | Table)[] {
  const labelById = new Map(diagram.nodes.map((n) => [n.id, n.label]));

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Component", bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Type", bold: true })] })] }),
        ],
      }),
      ...diagram.nodes.map(
        (node) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: node.label })] }),
              new TableCell({ children: [new Paragraph({ text: DIAGRAM_KIND_LABELS[node.kind] })] }),
            ],
          }),
      ),
    ],
  });

  const connectionParagraphs =
    diagram.edges.length > 0
      ? diagram.edges.map(
          (edge) =>
            new Paragraph({
              text: `${labelById.get(edge.from) ?? edge.from} → ${labelById.get(edge.to) ?? edge.to}${edge.label ? ` (${edge.label})` : ""}`,
              bullet: { level: 0 },
            }),
        )
      : [new Paragraph({ text: "(no connections specified)" })];

  return [
    new Paragraph({
      children: [new TextRun({ text: diagram.title || "Architecture Diagram", color: accentColor })],
      heading: HeadingLevel.HEADING_1,
    }),
    table,
    new Paragraph({ text: "" }),
    new Paragraph({ children: [new TextRun({ text: "Connections", bold: true })] }),
    ...connectionParagraphs,
  ];
}

// Templated generation (title + heading + paragraphs), not free-form AI
// text dropped into a blank document — see docs/TDD.md §2.6.
export async function buildDocx(
  deliverableType: DeliverableType,
  customerName: string,
  content: DeliverableContent,
  branding: BrandingInfo | null,
): Promise<Buffer> {
  const firmName = branding?.firmNameOverride;
  const accentColor = resolveAccentColor(branding?.primaryColor);
  const logo = branding?.logoUrl ? await fetchLogoAsset(branding.logoUrl) : null;

  const children: (Paragraph | Table)[] = [
    ...(logo
      ? [
          new Paragraph({
            children: [
              new ImageRun({
                type: logo.docxType,
                data: logo.buffer,
                transformation: { width: 140, height: 46 },
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      children: [
        new TextRun({ text: `${customerName} — ${DELIVERABLE_LABELS[deliverableType]}`, color: accentColor }),
      ],
      heading: HeadingLevel.TITLE,
    }),
    ...(firmName
      ? [new Paragraph({ children: [new TextRun({ text: firmName, italics: true })] })]
      : []),
    new Paragraph({
      children: [
        new TextRun({
          text: "AI-generated draft — review before sending to a client. Not certified compliance advice.",
          italics: true,
          color: "996600",
        }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  const isCode = isCodeDeliverable(deliverableType);

  for (const section of content.sections) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.heading, color: accentColor })],
        heading: HeadingLevel.HEADING_1,
      }),
    );
    if (isCode) {
      // One continuous shaded/monospace block per section rather than one
      // per paragraph — matches deliverable-view.tsx's rendering, and
      // survives the edit-save path (edit-actions.ts) splitting a script
      // with blank lines into multiple stored paragraphs: joining with the
      // same "\n\n" it was split on reassembles exactly one script.
      const lines = section.paragraphs.join("\n\n").split("\n");
      children.push(
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: "F0F0F0" },
          children: lines.map(
            (line, i) => new TextRun({ text: line, font: "Courier New", size: 18, break: i > 0 ? 1 : undefined }),
          ),
        }),
      );
    } else {
      for (const paragraph of section.paragraphs) {
        children.push(new Paragraph({ text: paragraph }));
      }
    }
  }

  if (content.diagram && supportsArchitectureDiagram(deliverableType)) {
    children.push(...buildDiagramBlock(content.diagram, accentColor));
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
