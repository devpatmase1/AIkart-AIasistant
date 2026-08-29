import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface KGSummaryProps {
  summary: string;
}

export const KGSummary = memo(function KGSummary({ summary }: KGSummaryProps) {
  const [expanded, setExpanded] = useState(true);

  if (!summary || summary.trim().length === 0) return null;

  return (
    <div className="rounded-lg border bg-primary/5 border-primary/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Knowledge Graph Insights</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-primary/60" />
        ) : (
          <ChevronDown className="w-4 h-4 text-primary/60" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 prose prose-sm max-w-none text-sm leading-relaxed text-foreground/80 [&_p]:text-foreground/80 [&_strong]:text-foreground [&_li]:text-foreground/80 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h4]:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
