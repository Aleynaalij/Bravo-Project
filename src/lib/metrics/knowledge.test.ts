import { describe, expect, it } from "vitest";
import { summarizeCrossReferences } from "./knowledge";

describe("summarizeCrossReferences", () => {
  it("returns an empty list for no rows", () => {
    expect(summarizeCrossReferences([])).toEqual([]);
  });

  it("counts one reference per row, ranked highest first", () => {
    const result = summarizeCrossReferences([
      { knowledge_vault_entries: { id: "a", title: "Entry A" } },
      { knowledge_vault_entries: { id: "b", title: "Entry B" } },
      { knowledge_vault_entries: { id: "a", title: "Entry A" } },
    ]);
    expect(result).toEqual([
      { id: "a", title: "Entry A", referenceCount: 2 },
      { id: "b", title: "Entry B", referenceCount: 1 },
    ]);
  });

  it("skips rows with no embedded entry", () => {
    const result = summarizeCrossReferences([
      { knowledge_vault_entries: null },
      { knowledge_vault_entries: { id: "a", title: "Entry A" } },
    ]);
    expect(result).toEqual([{ id: "a", title: "Entry A", referenceCount: 1 }]);
  });

  it("normalizes PostgREST's array-shaped embed the same as a single object", () => {
    const result = summarizeCrossReferences([
      { knowledge_vault_entries: [{ id: "a", title: "Entry A" }] },
      { knowledge_vault_entries: { id: "a", title: "Entry A" } },
    ]);
    expect(result).toEqual([{ id: "a", title: "Entry A", referenceCount: 2 }]);
  });

  it("caps the result at the top 10", () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      knowledge_vault_entries: { id: `id-${i}`, title: `Entry ${i}` },
    }));
    // Give id-0 extra references so it's unambiguously ranked first.
    rows.push({ knowledge_vault_entries: { id: "id-0", title: "Entry 0" } });
    const result = summarizeCrossReferences(rows);
    expect(result).toHaveLength(10);
    expect(result[0]).toEqual({ id: "id-0", title: "Entry 0", referenceCount: 2 });
  });
});
