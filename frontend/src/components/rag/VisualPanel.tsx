import { memo } from "react";
import {
  BookOpen,
  Network,
  List,
  FileSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { DocumentViewer } from "./DocumentViewer";
import { KnowledgeGraphView } from "./KnowledgeGraphView";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { EntityList } from "./EntityList";

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------
function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sub-tab button (smaller, for KG inner tabs)
// ---------------------------------------------------------------------------
function SubTabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyVisual() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <FileSearch className="w-7 h-7 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Select a document to view
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1 text-center max-w-[200px]">
        Click on an indexed document in the data panel to view its content
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KG Content — Graph + Analytics split or Entities full
// ---------------------------------------------------------------------------
const KGContent = memo(function KGContent({
  workspaceId,
  highlightEntities,
}: {
  workspaceId: string;
  highlightEntities: string[];
}) {
  const { kgSubTab, setKgSubTab } = useWorkspaceStore();

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Sub-tab bar */}
      <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 border-b bg-muted/20">
        <SubTabButton
          active={kgSubTab === "graph"}
          icon={<Network className="w-3 h-3" />}
          label="Graph"
          onClick={() => setKgSubTab("graph")}
        />
        <SubTabButton
          active={kgSubTab === "entities"}
          icon={<List className="w-3 h-3" />}
          label="Entities"
          onClick={() => setKgSubTab("entities")}
        />
      </div>

      {/* Content */}
      {kgSubTab === "graph" ? (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* Graph — 60% */}
          <div className="flex-[6] min-h-0 overflow-hidden border-b">
            <KnowledgeGraphView
              projectId={workspaceId}
              highlightEntities={highlightEntities}
            />
          </div>
          {/* Analytics — 40% */}
          <div className="flex-[4] min-h-0 overflow-y-auto p-3">
            <AnalyticsDashboard projectId={workspaceId} compact />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <EntityList
            projectId={workspaceId}
            highlightEntities={highlightEntities}
          />
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// VisualPanel — main export
// ---------------------------------------------------------------------------
interface VisualPanelProps {
  workspaceId: string;
  hasDeepragDocs: boolean;
}

export const VisualPanel = memo(function VisualPanel({
  workspaceId,
  hasDeepragDocs,
}: VisualPanelProps) {
  const {
    selectedDoc,
    activeTab,
    setActiveTab,
    scrollToPage,
    scrollToHeading,
    scrollToImageSrc,
    highlightChunks,
    highlightEntities,
    clearScrollTarget,
  } = useWorkspaceStore();

  if (!selectedDoc) return <EmptyVisual />;

  return (
    <div className="h-full flex flex-col overflow-hidden min-h-0">
      {/* Tab bar */}
      <div className="flex-shrink-0 flex items-center gap-1 px-3 py-2 border-b">
        <TabButton
          active={activeTab === "content"}
          icon={<BookOpen className="w-3.5 h-3.5" />}
          label="Content"
          onClick={() => setActiveTab("content")}
        />
        {hasDeepragDocs && (
          <TabButton
            active={activeTab === "kg"}
            icon={<Network className="w-3.5 h-3.5" />}
            label="Knowledge Graph"
            onClick={() => setActiveTab("kg")}
          />
        )}
        {/* Active highlights indicator */}
        {highlightChunks.length > 0 && (
          <span className="ml-auto text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {highlightChunks.length} highlighted
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "content" ? (
          <DocumentViewer
            doc={selectedDoc}
            scrollToPage={scrollToPage}
            scrollToHeading={scrollToHeading}
            scrollToImageSrc={scrollToImageSrc}
            highlightChunks={highlightChunks}
            onScrolled={clearScrollTarget}
          />
        ) : (
          <KGContent
            workspaceId={workspaceId}
            highlightEntities={highlightEntities}
          />
        )}
      </div>
    </div>
  );
});
