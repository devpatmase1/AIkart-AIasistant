import { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const STORAGE_KEY = "sidebar-collapsed";
const AUTO_COLLAPSE_WIDTH = 1440;

export function AppShell() {
  const [userCollapsed, setUserCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  });
  const [autoCollapsed, setAutoCollapsed] = useState(false);

  useEffect(() => {
    const check = () => setAutoCollapsed(window.innerWidth < AUTO_COLLAPSE_WIDTH);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const collapsed = userCollapsed || autoCollapsed;

  const toggleSidebar = useCallback(() => {
    setUserCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
