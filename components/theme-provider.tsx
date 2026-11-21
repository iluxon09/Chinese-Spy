"use client";

import {
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";

export type TiltTheme = "dark" | "light";

const STORAGE_KEY = "tilt-theme";
const subscribers = new Set<() => void>();

function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function notifySubscribers() {
  subscribers.forEach((listener) => listener());
}

function getThemeSnapshot(): TiltTheme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getServerThemeSnapshot(): TiltTheme {
  return "dark";
}

function applyTheme(theme: TiltTheme, persist = true) {
  document.documentElement.dataset.theme = theme;

  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The visual theme still changes when browser storage is unavailable.
    }
  }

  notifySubscribers();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;

      const nextTheme: TiltTheme = event.newValue === "light" ? "light" : "dark";
      applyTheme(nextTheme, false);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return <>{children}</>;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const toggleTheme = useCallback(() => {
    const nextTheme: TiltTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  }, [theme]);

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
