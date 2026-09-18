import { Fragment } from "react";
import { Document, Page, Text, View, Image, Svg, Rect, Line, Polygon, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { DeliverableContent } from "@/lib/validation/deliverable";
import type { DeliverableType } from "@/lib/domain/enums";
import { DELIVERABLE_LABELS, isCodeDeliverable, supportsArchitectureDiagram } from "@/lib/domain/labels";
import type { BrandingInfo } from "@/lib/branding";
import { resolveAccentColor } from "@/lib/branding";
import { fetchLogoAsset } from "./logo";
import { layoutDiagram, scaleToFit, edgeLine, DIAGRAM_KIND_COLORS, type ArchitectureDiagram } from "@/lib/diagram/layout";

const DIAGRAM_CANVAS_WIDTH = 480; // points, within an A4 page's content width
const DIAGRAM_CANVAS_HEIGHT = 320;

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica" },
  logo: { width: 120, marginBottom: 10 },
  title: { fontSize: 18, marginBottom: 4 },
  firmName: { fontSize: 10, fontStyle: "italic", marginBottom: 8, color: "#555555" },
  disclaimer: { fontSize: 9, fontStyle: "italic", color: "#996600", marginBottom: 16 },
  heading: { fontSize: 13, marginTop: 14, marginBottom: 6, fontWeight: 700 },
  paragraph: { marginBottom: 6, lineHeight: 1.4 },
  codeBlock: {
    marginBottom: 6,
    padding: 8,
    backgroundColor: "#F0F0F0",
    fontFamily: "Courier",
    fontSize: 9,
    lineHeight: 1.35,
  },
  diagramTitle: { fontSize: 10, marginBottom: 4, fontStyle: "italic" },
});

function arrowheadPoints(x: number, y: number, angle: number, size = 6): string {
  const a1 = angle + Math.PI * 0.85;
  const a2 = angle - Math.PI * 0.85;
  return `${x},${y} ${x + size * Math.cos(a1)},${y + size * Math.sin(a1)} ${x + size * Math.cos(a2)},${y + size * Math.sin(a2)}`;
}

// Real vector output (react-pdf's <Svg> primitives), not a rasterized
// image — no image-generation provider or rasterizer dependency needed.
// Uses the same grid layout (src/lib/diagram/layout.ts) the in-app SVG
// preview and PPTX export share, scaled to fit a fixed canvas.
function DiagramSvg({ diagram, accentColor }: { diagram: ArchitectureDiagram; accentColor: string }) {
  const layout = layoutDiagram(diagram);
  const { scale, offsetX, offsetY } = scaleToFit(layout, DIAGRAM_CANVAS_WIDTH, DIAGRAM_CANVAS_HEIGHT);
  const tx = (x: number) => offsetX + x * scale;
  const ty = (y: number) => offsetY + y * scale;
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));

  return (
    <Svg width={DIAGRAM_CANVAS_WIDTH} height={DIAGRAM_CANVAS_HEIGHT} viewBox={`0 0 ${DIAGRAM_CANVAS_WIDTH} ${DIAGRAM_CANVAS_HEIGHT}`}>
      {layout.edges.map((edge, i) => {
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        if (!from || !to) return null;
        const { x1, y1, x2, y2 } = edgeLine(from, to);
        const px1 = tx(x1);
        const py1 = ty(y1);
        const px2 = tx(x2);
        const py2 = ty(y2);
        const angle = Math.atan2(py2 - py1, px2 - px1);
        return (
          <Fragment key={i}>
            <Line x1={px1} y1={py1} x2={px2} y2={py2} stroke="#8b96a5" strokeWidth={1} />
            <Polygon points={arrowheadPoints(px2, py2, angle)} fill="#8b96a5" />
          </Fragment>
        );
      })}
      {layout.nodes.map((node) => {
        const colors = DIAGRAM_KIND_COLORS[node.kind];
        const x = tx(node.x);
        const y = ty(node.y);
        const w = node.w * scale;
        const h = node.h * scale;
        return (
          <Fragment key={node.id}>
            <Rect x={x} y={y} width={w} height={h} fill={`#${colors.fill}`} stroke={accentColor} strokeWidth={1} rx={4} />
            <Text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fill={`#${colors.text}`} style={{ fontSize: 8 }}>
              {node.label}
            </Text>
          </Fragment>
        );
      })}
    </Svg>
  );
}

// Uses @react-pdf/renderer rather than the Puppeteer approach in
// docs/TDD.md §2.6 — a pure-JS renderer avoids bundling headless Chromium
// into a serverless function, which is a real deployment-size/cold-start
// risk on Vercel. Revisit if a future deliverable type needs HTML/CSS
// fidelity this can't express.
export async function buildPdf(
  deliverableType: DeliverableType,
  customerName: string,
  content: DeliverableContent,
  branding: BrandingInfo | null,
): Promise<Buffer> {
  const firmName = branding?.firmNameOverride;
  const accentColor = `#${resolveAccentColor(branding?.primaryColor)}`;
  const logo = branding?.logoUrl ? await fetchLogoAsset(branding.logoUrl) : null;

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {logo && (
          // react-pdf's Image renders into the PDF document, not the DOM —
          // jsx-a11y's alt-text rule doesn't apply here.
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.logo} src={{ data: logo.buffer, format: logo.contentType === "image/png" ? "png" : "jpg" }} />
        )}
        <Text style={{ ...styles.title, color: accentColor }}>
          {customerName} — {DELIVERABLE_LABELS[deliverableType]}
        </Text>
        {firmName && <Text style={styles.firmName}>{firmName}</Text>}
        <Text style={styles.disclaimer}>
          AI-generated draft — review before sending to a client. Not certified compliance advice.
        </Text>
        {content.sections.map((section, i) => (
          <View key={i}>
            <Text style={{ ...styles.heading, color: accentColor }}>{section.heading}</Text>
            {isCodeDeliverable(deliverableType) ? (
              // One block per section, paragraphs rejoined with the same
              // separator edit-actions.ts splits on — see docx.ts's builder
              // for why that matters for a script with blank lines in it.
              <Text style={styles.codeBlock}>{section.paragraphs.join("\n\n")}</Text>
            ) : (
              section.paragraphs.map((paragraph, j) => (
                <Text key={j} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))
            )}
          </View>
        ))}
        {content.diagram && supportsArchitectureDiagram(deliverableType) && (
          <View>
            <Text style={{ ...styles.heading, color: accentColor }}>{content.diagram.title || "Architecture Diagram"}</Text>
            <DiagramSvg diagram={content.diagram} accentColor={accentColor} />
          </View>
        )}
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
