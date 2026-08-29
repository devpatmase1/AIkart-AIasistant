import { useMemo, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileText,
  Database,
  Image,
  Network,
  Link2,
  BarChart3,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { ProjectAnalytics, DocumentBreakdown } from "@/types";

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  className,
}: {
  icon: typeof FileText;
  label: string;
  value: number | string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card/60 px-3 py-2.5 space-y-0.5", className)}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn("w-3.5 h-3.5", accent ? "text-primary" : "text-muted-foreground")} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("text-xl font-bold", accent ? "text-primary" : "text-foreground")}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entity type distribution
// ---------------------------------------------------------------------------
function TypeDistribution({ types }: { types: Record<string, number> }) {
  const entries = useMemo(
    () => Object.entries(types).sort(([, a], [, b]) => b - a),
    [types]
  );
  const total = useMemo(() => entries.reduce((s, [, v]) => s + v, 0), [entries]);

  if (entries.length === 0) return null;

  const TYPE_COLORS: Record<string, string> = {
    person:       "bg-blue-400",
    organization: "bg-primary",
    location:     "bg-amber-400",
    event:        "bg-orange-400",
    concept:      "bg-purple-400",
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">Entity Types</span>

      {/* Stacked bar */}
      <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted">
        {entries.map(([type, count]) => (
          <motion.div
            key={type}
            initial={{ width: 0 }}
            animate={{ width: `${(count / total) * 100}%` }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={cn("h-full", TYPE_COLORS[type.toLowerCase()] ?? "bg-slate-400")}
            title={`${type}: ${count}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {entries.map(([type, count]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", TYPE_COLORS[type.toLowerCase()] ?? "bg-slate-400")} />
            <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
            <span className="text-[10px] font-medium">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-document breakdown bars
// ---------------------------------------------------------------------------
function DocumentBreakdownChart({ docs }: { docs: DocumentBreakdown[] }) {
  const maxChunks = useMemo(
    () => Math.max(1, ...docs.map((d) => d.chunk_count)),
    [docs]
  );

  if (docs.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Document Breakdown</span>
      </div>

      <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
        {docs.map((doc, i) => {
          const pct = (doc.chunk_count / maxChunks) * 100;
          const sizeStr = doc.file_size >= 1024 * 1024
            ? `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(doc.file_size / 1024)} KB`;

          const STATUS_COLOR: Record<string, string> = {
            indexed: "bg-primary",
            pending: "bg-muted-foreground",
            parsing: "bg-blue-400",
            indexing: "bg-amber-400",
            failed: "bg-destructive",
          };

          return (
            <motion.div
              key={doc.document_id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="space-y-0.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs truncate flex-1 min-w-0">{doc.filename}</span>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {doc.chunk_count} chunks · {doc.page_count > 0 ? `${doc.page_count}p · ` : ""}{sizeStr}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4, delay: i * 0.03 }}
                  className={cn("h-full rounded-full", STATUS_COLOR[doc.status] ?? "bg-muted-foreground")}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnalyticsDashboard — main export
// ---------------------------------------------------------------------------
interface AnalyticsDashboardProps {
  projectId: string;
  compact?: boolean;
}

export const AnalyticsDashboard = memo(function AnalyticsDashboard({ projectId, compact }: AnalyticsDashboardProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["project-analytics", projectId],
    queryFn: () => api.get<ProjectAnalytics>(`/rag/analytics/${projectId}`),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  if (!analytics) return null;

  const { stats, kg_analytics, document_breakdown } = analytics;

  return (
    <div className="space-y-5">
      {/* Stats grid */}
      <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6")}>
        <StatCard icon={FileText} label="Documents" value={stats.total_documents} />
        <StatCard icon={Database} label="Indexed" value={stats.indexed_documents} accent />
        <StatCard icon={Database} label="Chunks" value={stats.total_chunks} />
        <StatCard icon={Image} label="Images" value={stats.image_count ?? 0} />
        {kg_analytics && (
          <>
            <StatCard icon={Network} label="Entities" value={kg_analytics.entity_count} />
            <StatCard icon={Link2} label="Relationships" value={kg_analytics.relationship_count} />
          </>
        )}
      </div>

      {/* KG analytics */}
      {kg_analytics && kg_analytics.entity_count > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Entity type distribution */}
          <div className="rounded-lg border bg-card/60 p-4">
            <TypeDistribution types={kg_analytics.entity_types} />
          </div>

          {/* Top entities */}
          <div className="rounded-lg border bg-card/60 p-4 space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Top Entities</span>
            <div className="space-y-1">
              {kg_analytics.top_entities.slice(0, 8).map((entity, i) => (
                <div key={entity.name} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/50 w-4 text-right">{i + 1}</span>
                  <span className="text-xs truncate flex-1">{entity.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{entity.entity_type}</span>
                  <span className="text-[10px] font-medium text-primary">{entity.degree}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Per-document breakdown */}
      {document_breakdown.length > 0 && (
        <div className="rounded-lg border bg-card/60 p-4">
          <DocumentBreakdownChart docs={document_breakdown} />
        </div>
      )}
    </div>
  );
});
