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
import Tools from "./pages/admin/Tools";
import Files from "./pages/admin/Files";
import Settings from "./pages/admin/Settings";
import Tasks from "./pages/admin/Tasks";
import Templates from "./pages/admin/Templates";
import Reporting from "./pages/admin/Reporting";
import StabilityScorecardTool from "./pages/admin/tools/StabilityScorecard";
import RevenueLeakFinderTool from "./pages/admin/tools/RevenueLeakFinder";
import PersonaBuilderTool from "./pages/admin/tools/PersonaBuilder";
import JourneyMapperTool from "./pages/admin/tools/JourneyMapper";
import ProcessBreakdownTool from "./pages/admin/tools/ProcessBreakdown";
import CustomerDashboard from "./pages/portal/CustomerDashboard";
import MyTools from "./pages/portal/MyTools";
import ProgressPage from "./pages/portal/Progress";
import Account from "./pages/portal/Account";
import Uploads from "./pages/portal/Uploads";
import ClientSelfAssessment from "./pages/portal/tools/SelfAssessment";
import ImplementationTracker from "./pages/portal/tools/ImplementationTracker";
import WeeklyReflection from "./pages/portal/tools/WeeklyReflection";
import RevenueRiskMonitor from "./pages/portal/tools/RevenueRiskMonitor";
import RevenueLeakEngineClient from "./pages/portal/tools/RevenueLeakEngine";
// RGS OS domain pages
import CRMPipelineDomain from "./pages/admin/domains/CRMPipeline";
import ClientManagementDomain from "./pages/admin/domains/ClientManagement";
import ToolDistributionDomain from "./pages/admin/domains/ToolDistribution";
import ScorecardSystemDomain from "./pages/admin/domains/ScorecardSystem";
import DiagnosticSystemDomain from "./pages/admin/domains/DiagnosticSystem";
import OperationsSOPDomain from "./pages/admin/domains/OperationsSOP";
import RevenueFinancialsDomain from "./pages/admin/domains/RevenueFinancials";
import AddOnMonitoringDomain from "./pages/admin/domains/AddOnMonitoring";
import PortalDiagnostics from "./pages/portal/Diagnostics";
import PortalScorecard from "./pages/portal/Scorecard";
import PortalMonitoring from "./pages/portal/Monitoring";
import PortalBusinessControlCenter from "./pages/portal/BusinessControlCenter";
import AdminBusinessControlCenter from "./pages/admin/domains/BusinessControlCenter";
import RgsBusinessControlCenter from "./pages/admin/domains/RgsBusinessControlCenter";

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
            <Route path="/admin/tools" element={<ProtectedRoute requireRole="admin"><Tools /></ProtectedRoute>} />
            {/* RGS OS locked domain routes */}
            <Route path="/admin/crm-pipeline" element={<ProtectedRoute requireRole="admin"><CRMPipelineDomain /></ProtectedRoute>} />
            <Route path="/admin/client-management" element={<ProtectedRoute requireRole="admin"><ClientManagementDomain /></ProtectedRoute>} />
            <Route path="/admin/tool-distribution" element={<ProtectedRoute requireRole="admin"><ToolDistributionDomain /></ProtectedRoute>} />
            <Route path="/admin/scorecard-system" element={<ProtectedRoute requireRole="admin"><ScorecardSystemDomain /></ProtectedRoute>} />
            <Route path="/admin/diagnostic-system" element={<ProtectedRoute requireRole="admin"><DiagnosticSystemDomain /></ProtectedRoute>} />
            <Route path="/admin/operations-sop" element={<ProtectedRoute requireRole="admin"><OperationsSOPDomain /></ProtectedRoute>} />
            <Route path="/admin/revenue-financials" element={<ProtectedRoute requireRole="admin"><RevenueFinancialsDomain /></ProtectedRoute>} />
            <Route path="/admin/add-on-monitoring" element={<ProtectedRoute requireRole="admin"><AddOnMonitoringDomain /></ProtectedRoute>} />
            <Route path="/admin/business-control-center" element={<ProtectedRoute requireRole="admin"><AdminBusinessControlCenter /></ProtectedRoute>} />
            <Route path="/admin/business-control-center/:module" element={<ProtectedRoute requireRole="admin"><AdminBusinessControlCenter /></ProtectedRoute>} />
            <Route path="/admin/rgs-business-control-center" element={<ProtectedRoute requireRole="admin"><RgsBusinessControlCenter /></ProtectedRoute>} />
            <Route path="/admin/rgs-business-control-center/:module" element={<ProtectedRoute requireRole="admin"><RgsBusinessControlCenter /></ProtectedRoute>} />
            <Route path="/admin/tools/stability-scorecard" element={<ProtectedRoute requireRole="admin"><StabilityScorecardTool /></ProtectedRoute>} />
            <Route path="/admin/tools/revenue-leak-finder" element={<ProtectedRoute requireRole="admin"><RevenueLeakFinderTool /></ProtectedRoute>} />
            <Route path="/admin/tools/persona-builder" element={<ProtectedRoute requireRole="admin"><PersonaBuilderTool /></ProtectedRoute>} />
            <Route path="/admin/tools/journey-mapper" element={<ProtectedRoute requireRole="admin"><JourneyMapperTool /></ProtectedRoute>} />
            <Route path="/admin/tools/process-breakdown" element={<ProtectedRoute requireRole="admin"><ProcessBreakdownTool /></ProtectedRoute>} />
            <Route path="/admin/worksheets" element={<ProtectedRoute requireRole="admin"><Tools /></ProtectedRoute>} />
            <Route path="/admin/templates" element={<ProtectedRoute requireRole="admin"><Templates /></ProtectedRoute>} />
            <Route path="/admin/tasks" element={<ProtectedRoute requireRole="admin"><Tasks /></ProtectedRoute>} />
            <Route path="/admin/reporting" element={<ProtectedRoute requireRole="admin"><Reporting /></ProtectedRoute>} />
            <Route path="/admin/files" element={<ProtectedRoute requireRole="admin"><Files /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requireRole="admin"><Settings /></ProtectedRoute>} />
            {/* Customer portal */}
            <Route path="/portal" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/portal/tools" element={<ProtectedRoute><MyTools /></ProtectedRoute>} />
            <Route path="/portal/tools/self-assessment" element={<ProtectedRoute><ClientSelfAssessment /></ProtectedRoute>} />
            <Route path="/portal/tools/implementation-tracker" element={<ProtectedRoute><ImplementationTracker /></ProtectedRoute>} />
            <Route path="/portal/tools/weekly-reflection" element={<ProtectedRoute><WeeklyReflection /></ProtectedRoute>} />
            <Route path="/portal/tools/revenue-risk-monitor" element={<ProtectedRoute><RevenueRiskMonitor /></ProtectedRoute>} />
            <Route path="/portal/tools/revenue-leak-engine" element={<ProtectedRoute><RevenueLeakEngineClient /></ProtectedRoute>} />
            {/* RGS OS portal domain routes */}
            <Route path="/portal/diagnostics" element={<ProtectedRoute><PortalDiagnostics /></ProtectedRoute>} />
            <Route path="/portal/scorecard" element={<ProtectedRoute><PortalScorecard /></ProtectedRoute>} />
            <Route path="/portal/monitoring" element={<ProtectedRoute><PortalMonitoring /></ProtectedRoute>} />
            <Route path="/portal/business-control-center" element={<ProtectedRoute><PortalBusinessControlCenter /></ProtectedRoute>} />
            <Route path="/portal/business-control-center/:module" element={<ProtectedRoute><PortalBusinessControlCenter /></ProtectedRoute>} />
            <Route path="/portal/resources" element={<ProtectedRoute><MyTools /></ProtectedRoute>} />
            <Route path="/portal/worksheets" element={<ProtectedRoute><MyTools /></ProtectedRoute>} />
            <Route path="/portal/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
            <Route path="/portal/uploads" element={<ProtectedRoute><Uploads /></ProtectedRoute>} />
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
