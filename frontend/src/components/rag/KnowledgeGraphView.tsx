import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Network,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { KGGraphData, KGGraphNode, KGGraphEdge } from "@/types";

// ---------------------------------------------------------------------------
// Entity type → color mapping
// ---------------------------------------------------------------------------
const TYPE_COLORS: Record<string, string> = {
  person:       "#60a5fa", // blue-400
  organization: "#4ade80", // green-400 (primary-ish)
  location:     "#fbbf24", // amber-400
  event:        "#fb923c", // orange-400
  concept:      "#c084fc", // purple-400
};

function getNodeColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? "#94a3b8"; // slate-400 fallback
}

// ---------------------------------------------------------------------------
// Force simulation types
// ---------------------------------------------------------------------------
interface SimNode extends KGGraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null; // fixed position (dragging)
  fy: number | null;
}

// ---------------------------------------------------------------------------
// Simple force-directed layout
// ---------------------------------------------------------------------------
function initializeNodes(nodes: KGGraphNode[], width: number, height: number): SimNode[] {
  return nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const radius = Math.min(width, height) * 0.3;
    return {
      ...n,
      x: width / 2 + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
      y: height / 2 + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    };
  });
}

function simulateForces(
  nodes: SimNode[],
  edges: KGGraphEdge[],
  width: number,
  height: number,
  alpha: number
): void {
  const centerX = width / 2;
  const centerY = height / 2;

  // Repulsion between all nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (800 * alpha) / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      nodes[i].vx -= fx;
      nodes[i].vy -= fy;
      nodes[j].vx += fx;
      nodes[j].vy += fy;
    }
  }

  // Spring force for edges
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const edge of edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) continue;
    const dx = tgt.x - src.x;
    const dy = tgt.y - src.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const targetDist = 120;
    const force = (dist - targetDist) * 0.01 * alpha;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    src.vx += fx;
    src.vy += fy;
    tgt.vx -= fx;
    tgt.vy -= fy;
  }

  // Center gravity
  for (const node of nodes) {
    node.vx += (centerX - node.x) * 0.001 * alpha;
    node.vy += (centerY - node.y) * 0.001 * alpha;
  }

  // Apply velocities with damping
  for (const node of nodes) {
    if (node.fx !== null) {
      node.x = node.fx;
      node.vx = 0;
    } else {
      node.vx *= 0.6;
      node.x += node.vx;
      node.x = Math.max(20, Math.min(width - 20, node.x));
    }
    if (node.fy !== null) {
      node.y = node.fy;
      node.vy = 0;
    } else {
      node.vy *= 0.6;
      node.y += node.vy;
      node.y = Math.max(20, Math.min(height - 20, node.y));
    }
  }
}

// ---------------------------------------------------------------------------
// GraphCanvas — SVG rendering
// ---------------------------------------------------------------------------
interface GraphCanvasProps {
  data: KGGraphData;
  width: number;
  height: number;
  highlightEntities?: string[];
}

const GraphCanvas = memo(function GraphCanvas({ data, width, height, highlightEntities = [] }: GraphCanvasProps) {
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const frameRef = useRef<number>(0);
  const alphaRef = useRef(1);

  // Initialize nodes
  useEffect(() => {
    setNodes(initializeNodes(data.nodes, width, height));
    alphaRef.current = 1;
  }, [data.nodes, width, height]);

  // Run simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const tick = () => {
      if (alphaRef.current > 0.01) {
        setNodes((prev) => {
          const next = prev.map((n) => ({ ...n }));
          simulateForces(next, data.edges, width, height, alphaRef.current);
          return next;
        });
        alphaRef.current *= 0.99;
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [nodes.length, data.edges, width, height]);

  // Node map for edge rendering
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Connected edges for hover highlight
  const connectedEdges = useMemo(() => {
    if (!hoveredNode && !selectedNode) return new Set<number>();
    const target = selectedNode || hoveredNode;
    const set = new Set<number>();
    data.edges.forEach((e, i) => {
      if (e.source === target || e.target === target) set.add(i);
    });
    return set;
  }, [hoveredNode, selectedNode, data.edges]);

  const connectedNodes = useMemo(() => {
    const target = selectedNode || hoveredNode;
    if (!target) return new Set<string>();
    const set = new Set<string>([target]);
    data.edges.forEach((e) => {
      if (e.source === target) set.add(e.target);
      if (e.target === target) set.add(e.source);
    });
    return set;
  }, [hoveredNode, selectedNode, data.edges]);

  // Drag handlers
  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(nodeId);
    alphaRef.current = 0.3; // Reheat
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const svgRect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
      const x = (e.clientX - svgRect.left - pan.x) / zoom;
      const y = (e.clientY - svgRect.top - pan.y) / zoom;
      setNodes((prev) =>
        prev.map((n) => (n.id === dragging ? { ...n, fx: x, fy: y, x, y } : n))
      );
    } else if (panning) {
      setPan({
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      });
    }
  }, [dragging, panning, pan.x, pan.y, zoom]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setNodes((prev) =>
        prev.map((n) => (n.id === dragging ? { ...n, fx: null, fy: null } : n))
      );
      setDragging(null);
    }
    setPanning(false);
  }, [dragging]);

  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as Element).tagName === "rect") {
      setPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      setSelectedNode(null);
    }
  }, [pan]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  }, []);

  // Node radius based on degree
  const getRadius = useCallback((degree: number) => {
    return Math.max(6, Math.min(18, 6 + degree * 1.5));
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          className="p-1.5 rounded-md border bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
          className="p-1.5 rounded-md border bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="p-1.5 rounded-md border bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-10 flex gap-2 flex-wrap">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* SVG Canvas */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="rounded-lg border bg-card/30 cursor-grab active:cursor-grabbing"
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {data.edges.map((edge, i) => {
            const src = nodeMap.get(edge.source);
            const tgt = nodeMap.get(edge.target);
            if (!src || !tgt) return null;
            const highlighted = connectedEdges.has(i);
            const dimmed = (hoveredNode || selectedNode) && !highlighted;
            return (
              <line
                key={`${edge.source}-${edge.target}-${i}`}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={highlighted ? getNodeColor(src.entity_type) : "#475569"}
                strokeWidth={highlighted ? 2 : 1}
                strokeOpacity={dimmed ? 0.1 : highlighted ? 0.8 : 0.25}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const r = getRadius(node.degree);
            const color = getNodeColor(node.entity_type);
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode === node.id;
            const isHighlighted = highlightEntities.length > 0 &&
              highlightEntities.some((e) => e.toLowerCase() === node.label.toLowerCase());
            const dimmed = highlightEntities.length > 0
              ? !isHighlighted && !isHovered && !isSelected
              : (hoveredNode || selectedNode) && !connectedNodes.has(node.id);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
                className="cursor-pointer"
              >
                {/* Glow ring */}
                {(isHovered || isSelected || isHighlighted) && (
                  <circle
                    r={r + (isHighlighted ? 6 : 4)}
                    fill="none"
                    stroke={isHighlighted ? "#fbbf24" : color}
                    strokeWidth={isHighlighted ? 3 : 2}
                    strokeOpacity={isHighlighted ? 0.7 : 0.4}
                  >
                    {isHighlighted && (
                      <animate
                        attributeName="stroke-opacity"
                        values="0.7;0.3;0.7"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>
                )}
                {/* Node circle */}
                <circle
                  r={r}
                  fill={color}
                  fillOpacity={dimmed ? 0.15 : 0.85}
                  stroke={color}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeOpacity={dimmed ? 0.2 : 1}
                />
                {/* Label (shown when not too zoomed out) */}
                {zoom > 0.5 && (
                  <text
                    y={r + 12}
                    textAnchor="middle"
                    fontSize={10}
                    fill="currentColor"
                    fillOpacity={dimmed ? 0.15 : 0.7}
                    className="pointer-events-none select-none"
                  >
                    {node.label.length > 16 ? node.label.slice(0, 14) + "..." : node.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Selected node tooltip */}
      {selectedNode && (() => {
        const node = nodes.find((n) => n.id === selectedNode);
        if (!node) return null;
        return (
          <div className="absolute top-2 left-2 z-10 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg max-w-[220px]">
            <p className="text-sm font-semibold truncate">{node.label}</p>
            <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{node.entity_type}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{node.degree} connection{node.degree !== 1 ? "s" : ""}</p>
          </div>
        );
      })()}

      {data.is_truncated && (
        <div className="absolute bottom-2 right-2 z-10 text-[10px] text-amber-400 bg-background/80 backdrop-blur-sm border border-amber-400/30 rounded px-2 py-1">
          Graph truncated (too many nodes)
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// KnowledgeGraphView — main export
// ---------------------------------------------------------------------------
interface KnowledgeGraphViewProps {
  projectId: string;
  highlightEntities?: string[];
}

export const KnowledgeGraphView = memo(function KnowledgeGraphView({ projectId, highlightEntities = [] }: KnowledgeGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Observe container size — fill available space
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 50 && h > 50) {
          setDimensions({ width: w, height: h });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["kg-graph", projectId],
    queryFn: () => api.get<KGGraphData>(`/rag/graph/${projectId}?max_nodes=150&max_depth=3`),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading knowledge graph...</span>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Network className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No graph data available</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Process documents with NexusRAG to build the knowledge graph
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <GraphCanvas data={data} width={dimensions.width} height={dimensions.height} highlightEntities={highlightEntities} />
    </div>
  );
});
