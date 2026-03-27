import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, PenSquare, ClockArrowUp, Bot, BarChart3, UserCircle, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useLayoutStyle } from "@/hooks/useLayoutStyle";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/create", icon: PenSquare, label: "Create" },
  { path: "/history", icon: ClockArrowUp, label: "History" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/profile", icon: UserCircle, label: "Profile" },
];

function ClassicLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { appName } = useLayoutStyle();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top header bar */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <h1 className="font-heading font-bold text-lg text-foreground">{appName}</h1>
          <div className="flex items-center gap-1">
            {navItems.slice(0, 3).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16 overflow-y-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom tab bar - icon + text, rounded pill style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border safe-bottom z-50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full transition-all",
                  isActive
                    ? "gradient-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {isActive && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    className="text-xs font-semibold overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function ModernLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { appName } = useLayoutStyle();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Floating header */}
      <header className="sticky top-0 z-50 px-4 pt-3">
        <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-border shadow-elevated px-4 h-12 flex items-center justify-between max-w-lg mx-auto">
          <span className="font-heading font-bold text-sm gradient-primary bg-clip-text text-transparent" style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", background: "var(--gradient-primary)" }}>{appName}</span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => navigate("/profile")} className="p-2 rounded-lg text-muted-foreground hover:text-foreground">
              <UserCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 overflow-y-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Floating bottom nav */}
      <nav className="fixed bottom-4 left-4 right-4 z-50">
        <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-border shadow-elevated flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator-modern"
                    className="absolute -top-1 w-8 h-1 rounded-full gradient-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <item.icon
                  className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground")}
                />
                <span
                  className={cn("text-[10px] font-medium transition-colors", isActive ? "text-primary" : "text-muted-foreground")}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function MinimalLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { appName } = useLayoutStyle();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Clean minimal header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between h-14 px-6 max-w-lg mx-auto">
          <h1 className="font-heading font-bold text-foreground tracking-tight">{appName}</h1>
        </div>
        <div className="h-px bg-border/50" />
      </header>

      <main className="flex-1 pb-20 overflow-y-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Minimal bottom nav - icons only, subtle */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 safe-bottom z-50">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  isActive ? "text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { layout } = useLayoutStyle();

  switch (layout) {
    case "classic":
      return <ClassicLayout>{children}</ClassicLayout>;
    case "minimal":
      return <MinimalLayout>{children}</MinimalLayout>;
    case "modern":
    default:
      return <ModernLayout>{children}</ModernLayout>;
  }
}
