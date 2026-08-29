import { memo } from "react";
import { FileText, Database, Image, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RAGStats } from "@/types";

interface StatsBarProps {
  stats: RAGStats | undefined;
  processingCount?: number;
}

function StatItem({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof FileText;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("w-3.5 h-3.5", accent ? "text-primary" : "text-muted-foreground")} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold", accent ? "text-primary" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

export const StatsBar = memo(function StatsBar({ stats, processingCount = 0 }: StatsBarProps) {
  if (!stats) return null;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <StatItem icon={FileText} label="Documents" value={stats.total_documents} />
      <StatItem icon={Database} label="Indexed" value={stats.indexed_documents} accent />
      <StatItem icon={Database} label="Chunks" value={stats.total_chunks} />
      {(stats.image_count ?? 0) > 0 && (
        <StatItem icon={Image} label="Images" value={stats.image_count!} />
      )}

      {processingCount > 0 && (
        <div className="flex items-center gap-1.5 ml-auto">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
          <span className="text-xs text-amber-400 font-medium">
            Processing {processingCount} document{processingCount > 1 ? "s" : ""}...
          </span>
        </div>
      )}
    </div>
  );
});
