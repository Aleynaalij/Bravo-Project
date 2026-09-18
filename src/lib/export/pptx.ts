import PptxGenJS from "pptxgenjs";
import type { DeliverableContent } from "@/lib/validation/deliverable";
import type { DeliverableType } from "@/lib/domain/enums";
import { DELIVERABLE_LABELS, isCodeDeliverable, supportsArchitectureDiagram } from "@/lib/domain/labels";
import type { BrandingInfo } from "@/lib/branding";
import { resolveAccentColor } from "@/lib/branding";
import { fetchLogoAsset } from "./logo";
import { layoutDiagram, scaleToFit, edgeLine, DIAGRAM_KIND_COLORS, type ArchitectureDiagram } from "@/lib/diagram/layout";

// Content-area box the diagram is scaled into — same box addBullets/
// addCodeBlock use, so a diagram slide matches every other slide's margins.
const DIAGRAM_BOX = { x: 0.5, y: 1.3, w: 12.33, h: 5.6 };

// A section's paragraphs are split across multiple slides once they'd
// overflow a single slide — this is a presentation deck, not a page-for-page
// reflow of the DOCX/PDF. Budget is in characters (bullet text), not
// paragraph count, since paragraph length varies a lot between deliverable
// types (a one-line "Overview" bullet vs. a dense compliance paragraph).
const CHARS_PER_SLIDE = 700;

// A code-kind section (see labels.ts's isCodeDeliverable) gets its own
// budget in *lines*, not characters — a script slide needs to stay
// readable at a fixed monospace size, which bullets-with-char-budget
// (tuned for prose) doesn't produce.
const LINES_PER_SLIDE = 24;

// pptxgenjs declares a transitive `image-size` dependency with a known
// ICNS/JXL/HEIF parser DoS (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq), but
// its shipped bundle never actually calls it — the only code path that
// requires `sizeof` (note: not even the same package name) is dead,
// commented-out source left in dist/pptxgen.cjs.js. It's pinned to a
// patched 2.x via package.json "overrides" anyway, since a real dependency
// audit shouldn't have to rely on reading a competitor's dead code to stay
// clean. addImage() below always passes explicit w/h so pptxgenjs has no
// reason to probe image dimensions itself regardless.
export async function buildPptx(
  deliverableType: DeliverableType,
  customerName: string,
  content: DeliverableContent,
  branding: BrandingInfo | null,
): Promise<Buffer> {
  const firmName = branding?.firmNameOverride;
  const accentColor = resolveAccentColor(branding?.primaryColor);
  const logo = branding?.logoUrl ? await fetchLogoAsset(branding.logoUrl) : null;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "QUEPILOT_16X9", width: 13.33, height: 7.5 });
  pptx.layout = "QUEPILOT_16X9";

  const titleSlide = pptx.addSlide();
  if (logo) {
    titleSlide.addImage({
      data: `data:${logo.contentType};base64,${logo.buffer.toString("base64")}`,
      x: 0.6,
      y: 0.5,
      w: 1.8,
      h: 0.6,
    });
  }
  titleSlide.addText(`${customerName}\n${DELIVERABLE_LABELS[deliverableType]}`, {
    x: 0.6,
    y: 2.4,
    w: 12.1,
    h: 2,
    fontSize: 32,
    bold: true,
    align: "left",
    color: accentColor,
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

  const isCode = isCodeDeliverable(deliverableType);

  for (const section of content.sections) {
    if (isCode) {
      // Rejoined with the same separator edit-actions.ts splits saved text
      // on — see docx.ts's builder for why (a script with blank lines can
      // come back as several stored paragraphs; this reassembles one).
      const lines = section.paragraphs.join("\n\n").split("\n");
      for (let start = 0; start < lines.length; start += LINES_PER_SLIDE) {
        const chunk = lines.slice(start, start + LINES_PER_SLIDE);
        const slide = pptx.addSlide();
        addSlideHeading(slide, start === 0 ? section.heading : `${section.heading} (cont.)`, accentColor);
        addCodeBlock(slide, chunk.join("\n"));
      }
      continue;
    }

    let slide = pptx.addSlide();
    addSlideHeading(slide, section.heading, accentColor);
    let budget = CHARS_PER_SLIDE;
    let bullets: string[] = [];

    for (const paragraph of section.paragraphs) {
      if (paragraph.length > budget && bullets.length > 0) {
        addBullets(slide, bullets);
        slide = pptx.addSlide();
        addSlideHeading(slide, `${section.heading} (cont.)`, accentColor);
        budget = CHARS_PER_SLIDE;
        bullets = [];
      }
      bullets.push(paragraph);
      budget -= paragraph.length;
    }
    addBullets(slide, bullets);
  }

  if (content.diagram && supportsArchitectureDiagram(deliverableType)) {
    const slide = pptx.addSlide();
    addSlideHeading(slide, content.diagram.title || "Architecture Diagram", accentColor);
    addDiagram(slide, content.diagram);
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return buffer as Buffer;
}

function addSlideHeading(slide: PptxGenJS.Slide, heading: string, color: string) {
  slide.addText(heading, {
    x: 0.5,
    y: 0.4,
    w: 12.3,
    h: 0.8,
    fontSize: 24,
    bold: true,
    color,
  });
}

function addCodeBlock(slide: PptxGenJS.Slide, code: string) {
  slide.addShape("rect", { x: 0.5, y: 1.3, w: 12.33, h: 5.7, fill: { color: "F0F0F0" }, line: { type: "none" } });
  slide.addText(code, {
    x: 0.7,
    y: 1.45,
    w: 11.93,
    h: 5.4,
    fontFace: "Courier New",
    fontSize: 12,
    color: "1A1A2E",
    valign: "top",
  });
}

// Real native pptxgenjs shapes (addShape rect/line), not a rasterized
// image — PPTX has first-class support for exactly this, no rasterizer
// dependency needed. Uses the same grid layout the PDF/in-app renderers
// share, scaled into this deck's content-area box.
function addDiagram(slide: PptxGenJS.Slide, diagram: ArchitectureDiagram) {
  const layout = layoutDiagram(diagram);
  const { scale, offsetX, offsetY } = scaleToFit(layout, DIAGRAM_BOX.w, DIAGRAM_BOX.h);
  const tx = (x: number) => DIAGRAM_BOX.x + offsetX + x * scale;
  const ty = (y: number) => DIAGRAM_BOX.y + offsetY + y * scale;
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));

  for (const edge of layout.edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    const { x1, y1, x2, y2 } = edgeLine(from, to);
    const px1 = tx(x1);
    const py1 = ty(y1);
    const px2 = tx(x2);
    const py2 = ty(y2);
    slide.addShape("line", {
      x: Math.min(px1, px2),
      y: Math.min(py1, py2),
      w: Math.max(Math.abs(px2 - px1), 0.01),
      h: Math.max(Math.abs(py2 - py1), 0.01),
      flipH: px1 > px2,
      flipV: py1 > py2,
      line: { color: "8B96A5", width: 1, endArrowType: "triangle" },
    });
  }

  for (const node of layout.nodes) {
    const colors = DIAGRAM_KIND_COLORS[node.kind];
    const x = tx(node.x);
    const y = ty(node.y);
    const w = node.w * scale;
    const h = node.h * scale;
    slide.addShape("roundRect", {
      x,
      y,
      w,
      h,
      rectRadius: 0.06,
      fill: { color: colors.fill },
      line: { color: "DDE2E8", width: 1 },
    });
    slide.addText(node.label, {
      x,
      y,
      w,
      h,
      align: "center",
      valign: "middle",
      fontSize: 10,
      color: colors.text,
    });
  }
}

function addBullets(slide: PptxGenJS.Slide, paragraphs: string[]) {
  if (paragraphs.length === 0) return;
  slide.addText(
    paragraphs.map((text) => ({ text, options: { bullet: true, breakLine: true } })),
    { x: 0.6, y: 1.4, w: 12.1, h: 5.6, fontSize: 14, valign: "top", lineSpacingMultiple: 1.3 },
  );
}
