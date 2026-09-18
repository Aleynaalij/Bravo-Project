import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { DeliverableContent } from "@/lib/validation/deliverable";
import type { DeliverableType } from "@/lib/domain/enums";
import { DELIVERABLE_LABELS, isCodeDeliverable } from "@/lib/domain/labels";
import type { BrandingInfo } from "@/lib/branding";
import { resolveAccentColor } from "@/lib/branding";
import { fetchLogoAsset } from "./logo";

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
});

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
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
