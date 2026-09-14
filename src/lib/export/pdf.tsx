import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { DeliverableContent } from "@/lib/validation/deliverable";
import type { DeliverableType } from "@/lib/domain/enums";
import { DELIVERABLE_LABELS } from "@/lib/domain/labels";
import type { BrandingInfo } from "./branding";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4 },
  firmName: { fontSize: 10, fontStyle: "italic", marginBottom: 8, color: "#555555" },
  disclaimer: { fontSize: 9, fontStyle: "italic", color: "#996600", marginBottom: 16 },
  heading: { fontSize: 13, marginTop: 14, marginBottom: 6, fontWeight: 700 },
  paragraph: { marginBottom: 6, lineHeight: 1.4 },
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

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          {customerName} — {DELIVERABLE_LABELS[deliverableType]}
        </Text>
        {firmName && <Text style={styles.firmName}>{firmName}</Text>}
        <Text style={styles.disclaimer}>
          AI-generated draft — review before sending to a client. Not certified compliance advice.
        </Text>
        {content.sections.map((section, i) => (
          <View key={i}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.paragraphs.map((paragraph, j) => (
              <Text key={j} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
