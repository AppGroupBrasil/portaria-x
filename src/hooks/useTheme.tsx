import { useState, useEffect, useCallback } from "react";
import { type ThemeId, type ThemePalette, THEME_MAP, ALL_THEME_IDS } from "@/lib/themes";

type Theme = ThemeId;

const STORAGE_KEY = "app-theme";

function isValidTheme(v: string): v is ThemeId {
  return ALL_THEME_IDS.includes(v as ThemeId);
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidTheme(stored)) return stored;
  } catch {}
  return "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // Remove all theme classes
  ALL_THEME_IDS.forEach((t) => root.classList.remove(t));
  // Add the active one (except "light" which is the :root default)
  if (theme !== "light") {
    root.classList.add(theme);
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  }, []);

  // Cycle through all themes in order
  const toggleTheme = useCallback(() => {
    const idx = ALL_THEME_IDS.indexOf(theme);
    const next = ALL_THEME_IDS[(idx + 1) % ALL_THEME_IDS.length];
    setTheme(next);
  }, [theme, setTheme]);

  const p: ThemePalette = THEME_MAP[theme];

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: p.isDarkBase,
    p,
  };
}
