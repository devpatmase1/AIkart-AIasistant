/**
 * Theme Toggle Component
 * ======================
 *
 * Sun/Moon icon button that toggles between light and dark themes.
 */

import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";
import { Button } from "./button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  // Sync data-theme attribute on <html>
  useEffect(() => {
    const root = document.documentElement;
    // Enable transition class briefly for smooth switch
    root.classList.add("theme-transition");
    root.setAttribute("data-theme", theme);
    const timeout = setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 350);
    return () => clearTimeout(timeout);
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="w-8 h-8"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </Button>
  );
}
