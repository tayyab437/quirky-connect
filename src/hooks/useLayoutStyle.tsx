import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LayoutStyle = "classic" | "modern" | "minimal";

interface LayoutContextType {
  layout: LayoutStyle;
  setLayout: (l: LayoutStyle) => void;
  appName: string;
  setAppName: (n: string) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayoutState] = useState<LayoutStyle>(() =>
    (localStorage.getItem("app-layout") as LayoutStyle) || "modern"
  );
  const [appName, setAppNameState] = useState(() =>
    localStorage.getItem("app-name") || "SocialFlow"
  );

  // Load from admin_settings on mount
  useEffect(() => {
    (supabase.from as any)("admin_settings")
      .select("key, value")
      .in("key", ["app_layout", "app_name"])
      .then(({ data }: any) => {
        if (data) {
          data.forEach((d: any) => {
            if (d.key === "app_layout" && d.value) {
              setLayoutState(d.value as LayoutStyle);
              localStorage.setItem("app-layout", d.value);
            }
            if (d.key === "app_name" && d.value) {
              setAppNameState(d.value);
              localStorage.setItem("app-name", d.value);
            }
          });
        }
      });
  }, []);

  const setLayout = (l: LayoutStyle) => {
    setLayoutState(l);
    localStorage.setItem("app-layout", l);
  };

  const setAppName = (n: string) => {
    setAppNameState(n);
    localStorage.setItem("app-name", n);
  };

  return (
    <LayoutContext.Provider value={{ layout, setLayout, appName, setAppName }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutStyle() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayoutStyle must be used within LayoutProvider");
  return ctx;
}
