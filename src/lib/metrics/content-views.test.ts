import { describe, expect, it } from "vitest";
import { summarizeContentViews, type ContentSummaryRow } from "./content-views";

const allContent: ContentSummaryRow[] = [
  { id: "1", title: "Tenant migration checklist", contentType: "vault_entry" },
  { id: "2", title: "DLP rollback script", contentType: "script" },
  { id: "3", title: "Retention SOP", contentType: "sop" },
  { id: "4", title: "Insider risk playbook", contentType: "playbook" },
];

describe("summarizeContentViews", () => {
  it("returns everything as never-viewed and nothing as most-viewed when there are no view rows", () => {
    const result = summarizeContentViews([], allContent);
    expect(result.mostViewed).toEqual([]);
    expect(result.neverViewed).toEqual(allContent);
  });

  it("counts one row per viewer-day and ranks descending", () => {
    const result = summarizeContentViews(
      [
        { content_type: "vault_entry", content_id: "1" },
        { content_type: "vault_entry", content_id: "1" },
        { content_type: "vault_entry", content_id: "1" },
        { content_type: "script", content_id: "2" },
      ],
      allContent,
    );
    expect(result.mostViewed).toEqual([
      { id: "1", title: "Tenant migration checklist", contentType: "vault_entry", viewCount: 3 },
      { id: "2", title: "DLP rollback script", contentType: "script", viewCount: 1 },
    ]);
  });

  it("excludes viewed entries from neverViewed", () => {
    const result = summarizeContentViews([{ content_type: "sop", content_id: "3" }], allContent);
    expect(result.neverViewed).toEqual([
      { id: "1", title: "Tenant migration checklist", contentType: "vault_entry" },
      { id: "2", title: "DLP rollback script", contentType: "script" },
      { id: "4", title: "Insider risk playbook", contentType: "playbook" },
    ]);
  });

  it("does not conflate ids that collide across different content types", () => {
    const result = summarizeContentViews(
      [{ content_type: "vault_entry", content_id: "same-id" }],
      [
        { id: "same-id", title: "Vault entry", contentType: "vault_entry" },
        { id: "same-id", title: "Unrelated playbook", contentType: "playbook" },
      ],
    );
    expect(result.mostViewed).toEqual([{ id: "same-id", title: "Vault entry", contentType: "vault_entry", viewCount: 1 }]);
    expect(result.neverViewed).toEqual([{ id: "same-id", title: "Unrelated playbook", contentType: "playbook" }]);
  });

  it("caps mostViewed at 10 entries", () => {
    const manyContent: ContentSummaryRow[] = Array.from({ length: 15 }, (_, i) => ({
      id: `${i}`,
      title: `Entry ${i}`,
      contentType: "vault_entry" as const,
    }));
    const viewRows = manyContent.map((entry) => ({ content_type: entry.contentType, content_id: entry.id }));
    const result = summarizeContentViews(viewRows, manyContent);
    expect(result.mostViewed.length).toBe(10);
  });
});
