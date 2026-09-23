import { Document, Packer, Paragraph, HeadingLevel, TextRun, ImageRun } from "docx";
import type { SopContent } from "@/lib/validation/sop";
import { SOP_TYPE_LABELS, type SopType } from "@/lib/validation/sop";
import type { BrandingInfo } from "@/lib/branding";
import { resolveAccentColor } from "@/lib/branding";
import { fetchLogoAsset } from "./logo";

// A deliberately smaller sibling of docx.ts's buildDocx, not a shared
// abstraction over it — SOPs have none of the concerns that make
// buildDocx complex (no deliverable-type-specific code-block formatting,
// no architecture diagram), so entangling this with that function's
// branching would cost more than the duplication it'd save. Same
// per-file-duplication convention this codebase already uses for SOPs
// vs. Playbooks vs. deliverables elsewhere.
export async function buildSopDocx(
  sop: { title: string; sopType: SopType; content: SopContent },
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
              new ImageRun({ type: logo.docxType, data: logo.buffer, transformation: { width: 140, height: 46 } }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      children: [new TextRun({ text: sop.title, color: accentColor })],
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [new TextRun({ text: `Standard Operating Procedure — ${SOP_TYPE_LABELS[sop.sopType]}`, italics: true })],
    }),
    ...(firmName ? [new Paragraph({ children: [new TextRun({ text: firmName, italics: true })] })] : []),
    new Paragraph({ text: "" }),
  ];

  for (const section of sop.content.sections) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.heading, color: accentColor })],
        heading: HeadingLevel.HEADING_1,
      }),
    );
    for (const paragraph of section.paragraphs) {
      children.push(new Paragraph({ text: paragraph }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(doc);
}
