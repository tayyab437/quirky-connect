import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AppTheme = "default" | "ocean" | "sunset";
export type AppMode = "light" | "dark";

interface ThemeContextType {
  theme: AppTheme;
  mode: AppMode;
  setTheme: (t: AppTheme) => void;
  setMode: (m: AppMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() =>
    (localStorage.getItem("app-theme") as AppTheme) || "default"
  );
  const [mode, setModeState] = useState<AppMode>(() =>
    (localStorage.getItem("app-mode") as AppMode) || "light"
  );

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-theme", theme === "default" ? "" : theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    localStorage.setItem("app-mode", mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{
      theme,
      mode,
      setTheme: setThemeState,
      setMode: setModeState,
      toggleMode: () => setModeState(m => m === "light" ? "dark" : "light"),
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
