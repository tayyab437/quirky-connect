import { ReactNode, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, FileText, Share2, Settings, LogOut, ChevronLeft, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/users", icon: Users, label: "Users" },
  { path: "/admin/posts", icon: FileText, label: "Posts" },
  { path: "/admin/social-accounts", icon: Share2, label: "Social Accounts" },
  { path: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { mode, toggleMode } = useTheme();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300",
        open ? "w-64" : "w-16"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {open && <h1 className="font-heading font-bold text-lg text-foreground truncate">Admin Panel</h1>}
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="shrink-0">
            {open ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {open && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border space-y-1">
          <button onClick={toggleMode} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted">
            {mode === "dark" ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            {open && <span>{mode === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted">
            <ChevronLeft className="w-5 h-5 shrink-0" />
            {open && <span>Back to App</span>}
          </button>
          <button onClick={() => signOut()} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10">
            <LogOut className="w-5 h-5 shrink-0" />
            {open && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className={cn("flex-1 transition-all duration-300 min-h-screen", open ? "ml-64" : "ml-16")}>
        <div className="p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
