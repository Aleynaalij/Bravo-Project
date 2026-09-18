import { Document, Packer, Paragraph, HeadingLevel, TextRun, ImageRun, ShadingType } from "docx";
import type { DeliverableContent } from "@/lib/validation/deliverable";
import type { DeliverableType } from "@/lib/domain/enums";
import { DELIVERABLE_LABELS, isCodeDeliverable } from "@/lib/domain/labels";
import type { BrandingInfo } from "@/lib/branding";
import { resolveAccentColor } from "@/lib/branding";
import { fetchLogoAsset } from "./logo";

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

  const children: Paragraph[] = [
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

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
