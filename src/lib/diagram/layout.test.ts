import { describe, expect, it } from "vitest";
import { layoutDiagram, scaleToFit, edgeLine } from "./layout";
import type { ArchitectureDiagram } from "./layout";

const diagram: ArchitectureDiagram = {
  title: "Target Architecture",
  nodes: [
    { id: "tenant", label: "Customer Tenant", kind: "boundary" },
    { id: "dlp", label: "DLP", kind: "service" },
    { id: "retention", label: "Retention", kind: "service" },
    { id: "idp", label: "External IdP", kind: "external" },
  ],
  edges: [
    { from: "tenant", to: "dlp" },
    { from: "tenant", to: "retention" },
    { from: "idp", to: "tenant" },
  ],
};

describe("layoutDiagram", () => {
  it("gives every node a distinct, non-overlapping position", () => {
    const layout = layoutDiagram(diagram);

    expect(layout.nodes).toHaveLength(4);
    const positions = layout.nodes.map((n) => `${n.x},${n.y}`);
    expect(new Set(positions).size).toBe(4);
  });

  it("computes a bounding box that contains every node", () => {
    const layout = layoutDiagram(diagram);

    for (const node of layout.nodes) {
      expect(node.x + node.w).toBeLessThanOrEqual(layout.width + 1e-9);
      expect(node.y + node.h).toBeLessThanOrEqual(layout.height + 1e-9);
    }
  });

  it("gives a single boundary/hub node its own row, not sharing a row with any spoke", () => {
    // Regression: a plain sequential grid put the hub in the same row as
    // its spokes, so a direct hub->farSpoke edge drew straight through
    // whichever spoke sat between them (found by actually rendering a
    // sample diagram to PDF and PPTX and looking at it, not by inspection).
    const layout = layoutDiagram(diagram);
    const hub = layout.nodes.find((n) => n.kind === "boundary")!;

    for (const node of layout.nodes) {
      if (node.id === hub.id) continue;
      expect(node.y).not.toEqual(hub.y);
    }
  });

  it("falls back to a plain sequential grid when there's no single boundary node", () => {
    const noHub: ArchitectureDiagram = {
      title: "No hub",
      nodes: [
        { id: "a", label: "A", kind: "service" },
        { id: "b", label: "B", kind: "service" },
        { id: "c", label: "C", kind: "external" },
        { id: "d", label: "D", kind: "user" },
      ],
      edges: [],
    };

    const layout = layoutDiagram(noHub);

    expect(layout.nodes).toHaveLength(4);
    expect(new Set(layout.nodes.map((n) => `${n.x},${n.y}`)).size).toBe(4);
  });

  it("wraps to a new row once MAX_COLS is exceeded", () => {
    const manyNodes: ArchitectureDiagram = {
      title: "Big",
      nodes: Array.from({ length: 7 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}`, kind: "service" as const })),
      edges: [],
    };

    const layout = layoutDiagram(manyNodes);
    const rows = new Set(layout.nodes.map((n) => n.y));

    expect(rows.size).toBeGreaterThan(1);
  });
});

describe("scaleToFit", () => {
  it("preserves aspect ratio and centers the layout within the target box", () => {
    const layout = layoutDiagram(diagram);
    const { scale, offsetX, offsetY } = scaleToFit(layout, 480, 320);

    expect(scale).toBeGreaterThan(0);
    expect(offsetX).toBeGreaterThanOrEqual(0);
    expect(offsetY).toBeGreaterThanOrEqual(0);
    // The scaled layout should fit within the target box.
    expect(layout.width * scale).toBeLessThanOrEqual(480 + 1e-9);
    expect(layout.height * scale).toBeLessThanOrEqual(320 + 1e-9);
  });
});

describe("edgeLine", () => {
  it("clips the line to the boundary of each box rather than using raw centers", () => {
    const layout = layoutDiagram(diagram);
    const tenant = layout.nodes.find((n) => n.id === "tenant")!;
    const dlp = layout.nodes.find((n) => n.id === "dlp")!;

    const line = edgeLine(tenant, dlp);
    const tenantCenter = { x: tenant.x + tenant.w / 2, y: tenant.y + tenant.h / 2 };
    const dlpCenter = { x: dlp.x + dlp.w / 2, y: dlp.y + dlp.h / 2 };

    // The endpoints should sit strictly between the two centers, not at them.
    expect(line.x1).not.toEqual(tenantCenter.x);
    expect(line.x2).not.toEqual(dlpCenter.x);
  });
});
