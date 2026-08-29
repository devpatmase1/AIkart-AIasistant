import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// useMediaQuery — simple hook for responsive breakpoint
// ---------------------------------------------------------------------------
function useMediaQuery(query: string) {
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const [matches, setMatches] = useState(getSnapshot);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = () => setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// ---------------------------------------------------------------------------
// DetailPanel
// ---------------------------------------------------------------------------
interface DetailPanelProps {
  /** Whether the panel is visible */
  open: boolean;
  /** Called when the user closes the panel */
  onClose: () => void;
  /** Header content (title + tabs) */
  header?: ReactNode;
  /** Main scrollable content */
  children: ReactNode;
  /** Custom className on the panel wrapper */
  className?: string;
}

export function DetailPanel({ open, onClose, header, children, className }: DetailPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(45); // percentage of viewport
  const isDragging = useRef(false);

  // ---- Drag-to-resize (desktop only) ----
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = ((window.innerWidth - ev.clientX) / window.innerWidth) * 100;
      setPanelWidth(Math.min(70, Math.max(30, newWidth)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  // ---- Close on Escape ----
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ---- Desktop: side panel ----
  if (isDesktop) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{ width: `${panelWidth}vw` }}
            className={cn(
              "fixed top-0 right-0 h-full z-40",
              "bg-background border-l shadow-2xl",
              "flex flex-col",
              className
            )}
          >
            {/* Resize handle */}
            <div
              onMouseDown={handleMouseDown}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50"
            />

            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
              <div className="flex-1 min-w-0">{header}</div>
              <button
                onClick={onClose}
                className="ml-2 p-1.5 rounded-md hover:bg-muted transition-colors flex-shrink-0"
                title="Close panel (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ---- Mobile: fullscreen modal ----
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed inset-x-0 bottom-0 top-12 z-50",
              "bg-background rounded-t-xl shadow-2xl",
              "flex flex-col",
              className
            )}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
              <div className="flex-1 min-w-0">{header}</div>
              <button
                onClick={onClose}
                className="ml-2 p-1.5 rounded-md hover:bg-muted transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
