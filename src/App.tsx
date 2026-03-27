import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { LayoutProvider } from "@/hooks/useLayoutStyle";
import { useAdmin } from "@/hooks/useAdmin";
import AppLayout from "@/components/AppLayout";
import AdminLayout from "@/pages/admin/AdminLayout";
import AuthPage from "@/pages/AuthPage";
import Index from "@/pages/Index";
import CreatePostPage from "@/pages/CreatePostPage";
import PostHistoryPage from "@/pages/PostHistoryPage";
import AgentsPage from "@/pages/AgentsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminPostsPage from "@/pages/admin/AdminPostsPage";
import AdminSocialAccountsPage from "@/pages/admin/AdminSocialAccountsPage";
import AdminBlogsPage from "@/pages/admin/AdminBlogsPage";
import AdminDatabasePage from "@/pages/admin/AdminDatabasePage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  if (loading || adminLoading) return null;
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LayoutProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/auth" element={<AuthRoute />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/create" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><PostHistoryPage /></ProtectedRoute>} />
                <Route path="/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
                <Route path="/admin/posts" element={<AdminRoute><AdminPostsPage /></AdminRoute>} />
                <Route path="/admin/social-accounts" element={<AdminRoute><AdminSocialAccountsPage /></AdminRoute>} />
                <Route path="/admin/blogs" element={<AdminRoute><AdminBlogsPage /></AdminRoute>} />
                <Route path="/admin/database" element={<AdminRoute><AdminDatabasePage /></AdminRoute>} />
                <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LayoutProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
