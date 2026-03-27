import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, Share2, Settings, LogOut,
  ChevronLeft, Moon, Sun, BookOpen, Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLayoutStyle } from "@/hooks/useLayoutStyle";
import { cn } from "@/lib/utils";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup,
  SidebarGroupLabel, SidebarGroupContent, SidebarTrigger, SidebarInset,
} from "@/components/ui/sidebar";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/users", icon: Users, label: "Users" },
  { path: "/admin/posts", icon: FileText, label: "Posts" },
  { path: "/admin/social-accounts", icon: Share2, label: "Social Accounts" },
  { path: "/admin/blogs", icon: BookOpen, label: "Blogs" },
  { path: "/admin/database", icon: Database, label: "Database" },
  { path: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { mode, toggleMode } = useTheme();
  const { appName } = useLayoutStyle();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-heading font-bold text-sm">
                  {appName.charAt(0)}
                </span>
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-heading font-bold text-sm text-sidebar-foreground">{appName}</span>
                <span className="text-[10px] text-sidebar-foreground/50">Admin Panel</span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => navigate(item.path)}
                          tooltip={item.label}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={toggleMode} tooltip={mode === "dark" ? "Light Mode" : "Dark Mode"}>
                  {mode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{mode === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/")} tooltip="Back to App">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to App</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => signOut()} tooltip="Sign Out" className="text-destructive hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b border-border px-6">
            <SidebarTrigger />
            <h2 className="font-heading font-semibold text-foreground">
              {navItems.find(n => n.path === location.pathname)?.label || "Admin"}
            </h2>
          </header>
          <main className="flex-1 p-6 max-w-7xl">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
