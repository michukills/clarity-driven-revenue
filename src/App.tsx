import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import WhatWeDo from "./pages/WhatWeDo";
import SystemPage from "./pages/System";
import Diagnostic from "./pages/Diagnostic";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Scorecard from "./pages/Scorecard";
import Start from "./pages/Start";
import DiagnosticOffer from "./pages/DiagnosticOffer";
import DiagnosticApply from "./pages/DiagnosticApply";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/portal/ProtectedRoute";
import Auth from "./pages/portal/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Pipeline from "./pages/admin/Pipeline";
import Customers from "./pages/admin/Customers";
import CustomerDetail from "./pages/admin/CustomerDetail";
import Worksheets from "./pages/admin/Worksheets";
import Files from "./pages/admin/Files";
import Settings from "./pages/admin/Settings";
import CustomerDashboard from "./pages/portal/CustomerDashboard";
import MyResources from "./pages/portal/MyResources";
import ProgressPage from "./pages/portal/Progress";
import Account from "./pages/portal/Account";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/what-we-do" element={<WhatWeDo />} />
            <Route path="/system" element={<SystemPage />} />
            <Route path="/scorecard" element={<Scorecard />} />
            <Route path="/start" element={<Start />} />
            <Route path="/diagnostic" element={<Diagnostic />} />
            <Route path="/diagnostic-offer" element={<DiagnosticOffer />} />
            <Route path="/diagnostic-apply" element={<DiagnosticApply />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/pipeline" element={<ProtectedRoute requireRole="admin"><Pipeline /></ProtectedRoute>} />
            <Route path="/admin/customers" element={<ProtectedRoute requireRole="admin"><Customers /></ProtectedRoute>} />
            <Route path="/admin/customers/:id" element={<ProtectedRoute requireRole="admin"><CustomerDetail /></ProtectedRoute>} />
            <Route path="/admin/worksheets" element={<ProtectedRoute requireRole="admin"><Worksheets /></ProtectedRoute>} />
            <Route path="/admin/files" element={<ProtectedRoute requireRole="admin"><Files /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requireRole="admin"><Settings /></ProtectedRoute>} />
            {/* Customer portal */}
            <Route path="/portal" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/portal/resources" element={<ProtectedRoute><MyResources /></ProtectedRoute>} />
            <Route path="/portal/worksheets" element={<ProtectedRoute><MyResources filterType="sheet" /></ProtectedRoute>} />
            <Route path="/portal/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
            <Route path="/portal/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
