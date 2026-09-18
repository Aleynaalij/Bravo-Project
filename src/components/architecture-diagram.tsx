import {
  layoutDiagram,
  scaleToFit,
  edgeLine,
  DIAGRAM_KIND_COLORS,
  type ArchitectureDiagram,
} from "@/lib/diagram/layout";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;

// The in-app read-only preview — same grid layout the PDF/PPTX export
// builders use, rendered as a plain browser <svg> instead of react-pdf's
// <Svg> primitives (this runs client-side in the deliverable view, not
// inside a PDF document).
export function ArchitectureDiagramView({ diagram }: { diagram: ArchitectureDiagram }) {
  const layout = layoutDiagram(diagram);
  const { scale, offsetX, offsetY } = scaleToFit(layout, CANVAS_WIDTH, CANVAS_HEIGHT);
  const tx = (x: number) => offsetX + x * scale;
  const ty = (y: number) => offsetY + y * scale;
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]));

  return (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      className="w-full max-w-2xl rounded-md border border-border bg-surface"
      role="img"
      aria-label={diagram.title || "Architecture diagram"}
    >
      <defs>
        <marker id="diagram-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#8b96a5" />
        </marker>
      </defs>
      {layout.edges.map((edge, i) => {
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        if (!from || !to) return null;
        const { x1, y1, x2, y2 } = edgeLine(from, to);
        return (
          <line
            key={i}
            x1={tx(x1)}
            y1={ty(y1)}
            x2={tx(x2)}
            y2={ty(y2)}
            stroke="#8b96a5"
            strokeWidth={1.5}
            markerEnd="url(#diagram-arrow)"
          />
        );
      })}
      {layout.nodes.map((node) => {
        const colors = DIAGRAM_KIND_COLORS[node.kind];
        const x = tx(node.x);
        const y = ty(node.y);
        const w = node.w * scale;
        const h = node.h * scale;
        return (
          <g key={node.id}>
            <rect x={x} y={y} width={w} height={h} rx={6} fill={`#${colors.fill}`} stroke="#dde2e8" />
            <text
              x={x + w / 2}
              y={y + h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={`#${colors.text}`}
              fontSize={12}
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
