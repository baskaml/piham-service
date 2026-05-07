import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/piham/ThemeProvider";
import { AmbientBackdrop } from "@/components/piham/AmbientBackdrop";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteContentProvider } from "@/hooks/useSiteContent";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ServiceDetail from "./pages/ServiceDetail.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Admin from "./pages/Admin.tsx";
import AdminQuotes from "./pages/AdminQuotes.tsx";
import VisualEditor from "./pages/VisualEditor.tsx";
import DynamicPage from "./pages/DynamicPage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AmbientBackdrop />
            <SiteContentProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/services/:slug" element={<ServiceDetail />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
              <Route path="/admin/editor" element={<ProtectedRoute requireAdmin><VisualEditor /></ProtectedRoute>} />
              <Route path="/admin/quotes" element={<ProtectedRoute requireAdmin><AdminQuotes /></ProtectedRoute>} />
              <Route path="/p/:slug" element={<DynamicPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </SiteContentProvider>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
