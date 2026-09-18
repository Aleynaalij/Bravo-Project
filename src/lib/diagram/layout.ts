import type { DeliverableContent } from "@/lib/validation/deliverable";

// The one shape every renderer (in-app SVG preview, PDF's react-pdf <Svg>
// primitives, PPTX's native shapes, DOCX's table fallback) consumes —
// computed once here so a layout change never needs to be kept in sync
// across four separate renderers.
export type ArchitectureDiagram = NonNullable<DeliverableContent["diagram"]>;
export type DiagramNodeKind = ArchitectureDiagram["nodes"][number]["kind"];

export interface LayoutNode {
  id: string;
  label: string;
  kind: DiagramNodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiagramLayout {
  title: string;
  width: number;
  height: number;
  nodes: LayoutNode[];
  edges: ArchitectureDiagram["edges"];
}

// Units are an abstract grid, not inches/points — every renderer scales
// this to its own physical canvas (see scaleToFit below), so the layout
// itself stays renderer-agnostic.
const NODE_W = 2.4;
const NODE_H = 1;
const H_GAP = 0.6;
const V_GAP = 0.7;
const MAX_COLS = 3;
const MARGIN = 0.3;

// Deliberately a plain grid, not a real graph-layout algorithm (no
// dagre/elk dependency) — these HLD diagrams run 3-14 nodes centered on
// one or two hub nodes (a tenant/boundary talking to several services),
// which a simple grid renders legibly without pulling in a new library
// for what's the "first tier" of this feature (see docs/validation-
// checklist.md). Revisit if a later diagram type needs real routing.
//
// One real exception the plain sequential grid got wrong, found by
// actually rendering a sample diagram (not just eyeballing the code): the
// model's own instructions (prompt.ts) ask for exactly one "boundary"
// node that most other nodes connect to. A sequential grid puts that hub
// in the same row as its spokes, so a direct edge to a farther spoke
// draws a straight line through whichever spoke sits between them —
// visually indistinguishable from a (wrong) edge between those two
// spokes instead. Giving a single hub its own row above the rest avoids
// that specific collinear-overlap case without needing real obstacle-
// aware routing.
export function layoutDiagram(diagram: ArchitectureDiagram): DiagramLayout {
  const boundaryNodes = diagram.nodes.filter((n) => n.kind === "boundary");
  const hub = boundaryNodes.length === 1 ? boundaryNodes[0] : null;
  const rest = hub ? diagram.nodes.filter((n) => n.id !== hub.id) : diagram.nodes;

  const cols = Math.min(MAX_COLS, rest.length) || 1;
  const restRows = Math.ceil(rest.length / cols) || (hub ? 0 : 1);
  const hubRowHeight = hub ? NODE_H + V_GAP : 0;

  const nodes: LayoutNode[] = [];
  if (hub) {
    const rowWidth = cols * NODE_W + (cols - 1) * H_GAP;
    nodes.push({ ...hub, x: MARGIN + (rowWidth - NODE_W) / 2, y: MARGIN, w: NODE_W, h: NODE_H });
  }
  rest.forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    nodes.push({
      ...n,
      x: MARGIN + col * (NODE_W + H_GAP),
      y: MARGIN + hubRowHeight + row * (NODE_H + V_GAP),
      w: NODE_W,
      h: NODE_H,
    });
  });

  return {
    title: diagram.title,
    width: MARGIN * 2 + cols * NODE_W + (cols - 1) * H_GAP,
    height: MARGIN * 2 + hubRowHeight + restRows * NODE_H + Math.max(restRows - 1, 0) * V_GAP,
    nodes,
    edges: diagram.edges,
  };
}

// Scales (and centers) a layout's grid units onto a renderer's actual
// canvas size, preserving aspect ratio — the one piece of math every
// renderer would otherwise have had to duplicate.
export function scaleToFit(
  layout: DiagramLayout,
  targetWidth: number,
  targetHeight: number,
): { scale: number; offsetX: number; offsetY: number } {
  const scale = Math.min(targetWidth / layout.width, targetHeight / layout.height);
  return {
    scale,
    offsetX: (targetWidth - layout.width * scale) / 2,
    offsetY: (targetHeight - layout.height * scale) / 2,
  };
}

function boundaryPoint(cx: number, cy: number, hw: number, hh: number, dx: number, dy: number) {
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

// A straight line from the edge of `from`'s box to the edge of `to`'s box
// (not center-to-center) — so an arrow visibly touches both boxes instead
// of running underneath them.
export function edgeLine(from: LayoutNode, to: LayoutNode): { x1: number; y1: number; x2: number; y2: number } {
  const c1 = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
  const c2 = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const start = boundaryPoint(c1.x, c1.y, from.w / 2, from.h / 2, dx, dy);
  const end = boundaryPoint(c2.x, c2.y, to.w / 2, to.h / 2, -dx, -dy);
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

export const DIAGRAM_KIND_COLORS: Record<DiagramNodeKind, { fill: string; text: string }> = {
  boundary: { fill: "0f6cbd", text: "ffffff" },
  service: { fill: "ffffff", text: "0f1a2b" },
  external: { fill: "f0f3f6", text: "0f1a2b" },
  user: { fill: "742774", text: "ffffff" },
};
