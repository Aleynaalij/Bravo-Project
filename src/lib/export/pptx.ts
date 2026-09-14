import PptxGenJS from "pptxgenjs";
import type { DeliverableContent } from "@/lib/validation/deliverable";
import type { DeliverableType } from "@/lib/domain/enums";
import { DELIVERABLE_LABELS } from "@/lib/domain/labels";
import type { BrandingInfo } from "./branding";

// A section's paragraphs are split across multiple slides once they'd
// overflow a single slide — this is a presentation deck, not a page-for-page
// reflow of the DOCX/PDF. Budget is in characters (bullet text), not
// paragraph count, since paragraph length varies a lot between deliverable
// types (a one-line "Overview" bullet vs. a dense compliance paragraph).
const CHARS_PER_SLIDE = 700;

// pptxgenjs's image-embedding path depends on a transitive `image-size`
// version with a known ICNS/JXL/HEIF parser DoS (GHSA-w3rx-r6r6-pgpr,
// GHSA-5p2g-fcmc-qvqq). Not exploitable today — this module never embeds an
// image (no branding-logo UI exists yet, see branding.ts) — but revisit
// this dependency once logo embedding ships.
export async function buildPptx(
  deliverableType: DeliverableType,
  customerName: string,
  content: DeliverableContent,
  branding: BrandingInfo | null,
): Promise<Buffer> {
  const firmName = branding?.firmNameOverride;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PURVIEWPILOT_16X9", width: 13.33, height: 7.5 });
  pptx.layout = "PURVIEWPILOT_16X9";

  const titleSlide = pptx.addSlide();
  titleSlide.addText(`${customerName}\n${DELIVERABLE_LABELS[deliverableType]}`, {
    x: 0.6,
    y: 2.4,
    w: 12.1,
    h: 2,
    fontSize: 32,
    bold: true,
    align: "left",
  });
  if (firmName) {
    titleSlide.addText(firmName, {
      x: 0.6,
      y: 4.3,
      w: 12.1,
      h: 0.5,
      fontSize: 16,
      italic: true,
      color: "555555",
    });
  }
  titleSlide.addText(
    "AI-generated draft — review before sending to a client. Not certified compliance advice.",
    { x: 0.6, y: 6.7, w: 12.1, h: 0.5, fontSize: 10, italic: true, color: "996600" },
  );

  for (const section of content.sections) {
    let slide = pptx.addSlide();
    addSlideHeading(slide, section.heading);
    let budget = CHARS_PER_SLIDE;
    let bullets: string[] = [];

    for (const paragraph of section.paragraphs) {
      if (paragraph.length > budget && bullets.length > 0) {
        addBullets(slide, bullets);
        slide = pptx.addSlide();
        addSlideHeading(slide, `${section.heading} (cont.)`);
        budget = CHARS_PER_SLIDE;
        bullets = [];
      }
      bullets.push(paragraph);
      budget -= paragraph.length;
    }
    addBullets(slide, bullets);
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return buffer as Buffer;
}

function addSlideHeading(slide: PptxGenJS.Slide, heading: string) {
  slide.addText(heading, {
    x: 0.5,
    y: 0.4,
    w: 12.3,
    h: 0.8,
    fontSize: 24,
    bold: true,
  });
}

function addBullets(slide: PptxGenJS.Slide, paragraphs: string[]) {
  if (paragraphs.length === 0) return;
  slide.addText(
    paragraphs.map((text) => ({ text, options: { bullet: true, breakLine: true } })),
    { x: 0.6, y: 1.4, w: 12.1, h: 5.6, fontSize: 14, valign: "top", lineSpacingMultiple: 1.3 },
  );
}
