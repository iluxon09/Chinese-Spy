"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";

export type TiltTheme = "dark" | "light";

const STORAGE_KEY = "tilt-theme";

type ThemeContextValue = {
  theme: TiltTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: TiltTheme, persist = true) {
  document.documentElement.dataset.theme = theme;

  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The visual theme still changes when browser storage is unavailable.
    }
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<TiltTheme>("dark");

  useEffect(() => {
    const initialTheme: TiltTheme =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";

    setTheme(initialTheme);
    applyTheme(initialTheme, false);

    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;

      const nextTheme: TiltTheme = event.newValue === "light" ? "light" : "dark";
      setTheme(nextTheme);
      applyTheme(nextTheme, false);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme: TiltTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, [theme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("ThemeToggle must be rendered inside ThemeProvider.");
  }

  const { theme, toggleTheme } = context;
  const nextTheme = theme === "dark" ? "light" : "dark";
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      className={compact ? "theme-toggle theme-toggle-compact" : "theme-toggle"}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${nextTheme} mode`}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        <ThemeIcon size={compact ? 18 : 17} />
      </span>
      {!compact && (
        <span className="theme-toggle-copy">
          <small>APPEARANCE</small>
          <strong>{theme === "dark" ? "Dark mode" : "Light mode"}</strong>
        </span>
      )}
      <span className="theme-toggle-track" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
