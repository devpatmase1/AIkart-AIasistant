import { memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Database, ChevronLeft, ChevronRight } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { BrandMark } from "@/components/ui/BrandMark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = memo(function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: workspaces } = useWorkspaces();

  const activeWorkspaceId = location.pathname.match(/\/knowledge-bases\/(\d+)/)?.[1];
  const isHome = location.pathname === "/";

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-white/95 backdrop-blur-2xl border-r border-slate-200/80 shadow-[2px_0_15px_rgba(0,0,0,0.03)] transition-all duration-200 flex-shrink-0 z-20",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 border-b border-slate-100 flex-shrink-0 transition-all duration-200",
        collapsed ? "justify-center px-0" : "justify-between px-4"
      )}>
        <button
          onClick={() => navigate("/")}
          className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          title="Go to Home"
        >
          <BrandMark variant={collapsed ? "icon" : "full"} size="md" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-shrink-0 px-3 pt-4 space-y-1">
        <button
          onClick={() => navigate("/")}
          className={cn(
            "w-full flex items-center gap-3 rounded-full py-2 px-3.5 text-sm transition-all duration-150 cursor-pointer",
            isHome && !activeWorkspaceId
              ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
          title={collapsed ? "Knowledge Bases" : undefined}
        >
          <Database className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="truncate">Knowledge Bases</span>}
        </button>
      </nav>

      {/* Scrollable workspace list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!collapsed && workspaces && workspaces.length > 0 && (
          <div className="mt-4 px-3">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Workspaces
            </p>
            <div className="space-y-1">
              {workspaces.slice(0, 20).map((ws) => {
                const isActive = activeWorkspaceId === String(ws.id);
                return (
                  <button
                    key={ws.id}
                    onClick={() => navigate(`/knowledge-bases/${ws.id}`)}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm transition-all duration-150 cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Database className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{ws.name}</span>
                    <span className="ml-auto text-[11px] opacity-70 tabular-nums">
                      {ws.document_count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Collapsed indicators */}
        {collapsed && (
          <div className="mt-4 px-2 space-y-1">
            {workspaces?.slice(0, 6).map((ws) => {
              const isActive = activeWorkspaceId === String(ws.id);
              return (
                <button
                  key={`ws-${ws.id}`}
                  onClick={() => navigate(`/knowledge-bases/${ws.id}`)}
                  className={cn(
                    "w-full flex items-center justify-center py-1.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                  title={ws.name}
                >
                  <Database className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border px-2 py-2 flex items-center justify-between">
        <ThemeToggle />
        <button
          onClick={onToggle}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
});
