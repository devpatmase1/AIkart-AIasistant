import { useState, memo, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RetrievedChunk, Citation } from "@/types";

// ---------------------------------------------------------------------------
// Query term highlighter
// ---------------------------------------------------------------------------
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (terms.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Citation badge
// ---------------------------------------------------------------------------
function CitationBadge({ citation, index }: { citation?: Citation; index: number }) {
  if (!citation) return null;

  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-primary/15 text-primary cursor-default"
      title={citation.formatted || `${citation.source_file}${citation.page_no ? ` p.${citation.page_no}` : ""}`}
    >
      {index + 1}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Relevance bar
// ---------------------------------------------------------------------------
function RelevanceBar({ score }: { score: number }) {
  // score is distance (lower = better), convert to similarity
  const similarity = Math.max(0, Math.min(1, 1 - score));
  const pct = similarity * 100;

  return (
    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          pct >= 70 ? "bg-primary" : pct >= 40 ? "bg-amber-400" : "bg-destructive/60"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultCard
// ---------------------------------------------------------------------------
interface ResultCardProps {
  chunk: RetrievedChunk;
  index: number;
  query: string;
}

export const ResultCard = memo(function ResultCard({ chunk, index, query }: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLong = chunk.content.length > 300;
  const displayText = expanded || !isLong ? chunk.content : chunk.content.slice(0, 300) + "...";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(chunk.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [chunk.content]);

  const similarity = Math.max(0, 1 - chunk.score);
  const citation = chunk.citation;
  const source = citation?.source_file || String(chunk.metadata.source || "");
  const pageNo = citation?.page_no ?? (chunk.metadata.page_no as number | undefined);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group rounded-lg border bg-card/60 hover:bg-card transition-colors overflow-hidden"
    >
      <div className="px-4 py-3 space-y-2">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CitationBadge citation={citation} index={index} />
            {source && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                <FileText className="w-3 h-3 flex-shrink-0" />
                {source}
              </span>
            )}
            {pageNo != null && (
              <span className="text-xs text-muted-foreground/60">p.{pageNo}</span>
            )}
            {citation?.heading_path && citation.heading_path.length > 0 && (
              <span className="text-xs text-muted-foreground/50 truncate hidden sm:inline">
                {citation.heading_path.join(" > ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] font-medium text-muted-foreground/60">
              {(similarity * 100).toFixed(0)}%
            </span>
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
              title="Copy content"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          <HighlightedText text={displayText} query={query} />
        </p>

        {/* Expand toggle */}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3" /> Show less</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> Show more</>
            )}
          </button>
        )}
      </div>

      {/* Relevance bar at bottom */}
      <RelevanceBar score={chunk.score} />
    </motion.div>
  );
});
