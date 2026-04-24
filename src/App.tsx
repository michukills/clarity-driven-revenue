import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
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
import Implementation from "./pages/Implementation";
import RevenueControlSystem from "./pages/RevenueControlSystem";
// P8.2 Problem-led SEO hub + spokes (public site only)
import WhyBusinessesLoseRevenue from "./pages/insights/WhyBusinessesLoseRevenue";
import IdentifyIdealCustomer from "./pages/insights/IdentifyIdealCustomer";
import TrackRevenueCashFlowWeekly from "./pages/insights/TrackRevenueCashFlowWeekly";
import LosingCustomersBeforeTheyBuy from "./pages/insights/LosingCustomersBeforeTheyBuy";
import MeasureBusinessStability from "./pages/insights/MeasureBusinessStability";
import FixOperationalBottlenecks from "./pages/insights/FixOperationalBottlenecks";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/portal/ProtectedRoute";
import RccGate from "./components/portal/RccGate";
import Auth from "./pages/portal/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Customers from "./pages/admin/Customers";
import CustomerDetail from "./pages/admin/CustomerDetail";
import Tools from "./pages/admin/Tools";
import ToolMatrix from "./pages/admin/ToolMatrix";
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
import RevenueReviewSync from "./pages/portal/tools/RevenueReviewSync";
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
import ClientRevenueTrackerPage from "./pages/portal/ClientRevenueTrackerPage";
import RgsBusinessControlCenter from "./pages/admin/domains/RgsBusinessControlCenter";
import AdminClientBusinessControl from "./pages/admin/ClientBusinessControl";
import PendingAccounts from "./pages/admin/PendingAccounts";
import SavedBenchmarks from "./pages/admin/SavedBenchmarks";
import AdminReports from "./pages/admin/Reports";
import AdminReportEditor from "./pages/admin/ReportEditor";
import ClientReports from "./pages/portal/Reports";
import ClientReportView from "./pages/portal/ReportView";
import RgsReviewQueuePage from "./pages/admin/RgsReviewQueue";
import IntegrationPlanning from "./pages/admin/IntegrationPlanning";
import AdminImports from "./pages/admin/Imports";
import ClientImports from "./pages/portal/Imports";
// P12.4 — Unified workspaces (consolidation pass)
import ProvideData from "./pages/portal/ProvideData";
import DiagnosticWorkspace from "./pages/admin/domains/DiagnosticWorkspace";
import ImplementationWorkspace from "./pages/admin/domains/ImplementationWorkspace";
import ConnectedSources from "./pages/portal/ConnectedSources";
import Eula from "./pages/Eula";
import Privacy from "./pages/Privacy";
import AdminScorecardLeads from "./pages/admin/ScorecardLeads";

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
            {/* P8.1: `/diagnostic-offer` is the legacy alternate diagnostic page.
                Funnel is consolidated to `/diagnostic`; this route now redirects
                to the canonical page. The component is kept available in case a
                future split test wants to restore it. */}
            <Route path="/diagnostic-offer" element={<Navigate to="/diagnostic" replace />} />
            <Route path="/diagnostic-offer-legacy" element={<DiagnosticOffer />} />
            <Route path="/diagnostic-apply" element={<DiagnosticApply />} />
            <Route path="/implementation" element={<Implementation />} />
            <Route path="/revenue-control-system" element={<RevenueControlSystem />} />
            {/* P8.2 — Problem-led SEO hub + spoke pages. Public-only,
                no nav clutter; surfaced via footer "Insights" column,
                hub-spoke cross-links, and spoke→hub back-links. */}
            <Route path="/why-businesses-lose-revenue" element={<WhyBusinessesLoseRevenue />} />
            <Route path="/identify-ideal-customer" element={<IdentifyIdealCustomer />} />
            <Route path="/track-revenue-cash-flow-weekly" element={<TrackRevenueCashFlowWeekly />} />
            <Route path="/losing-customers-before-they-buy" element={<LosingCustomersBeforeTheyBuy />} />
            <Route path="/measure-business-stability" element={<MeasureBusinessStability />} />
            <Route path="/fix-operational-bottlenecks" element={<FixOperationalBottlenecks />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/eula" element={<Eula />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/auth" element={<Auth />} />
            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboard /></ProtectedRoute>} />
            {/* P12.4.B.UI: Legacy flow-chart Pipeline page removed; /admin/pipeline now redirects to the lifecycle board. */}
            <Route path="/admin/pipeline" element={<Navigate to="/admin/customers" replace />} />
            <Route path="/admin/customers" element={<ProtectedRoute requireRole="admin"><Customers /></ProtectedRoute>} />
            <Route path="/admin/customers/:id" element={<ProtectedRoute requireRole="admin"><CustomerDetail /></ProtectedRoute>} />
            <Route path="/admin/clients/:id/business-control" element={<ProtectedRoute requireRole="admin"><AdminClientBusinessControl /></ProtectedRoute>} />
            <Route path="/admin/pending-accounts" element={<ProtectedRoute requireRole="admin"><PendingAccounts /></ProtectedRoute>} />
            <Route path="/admin/tools" element={<ProtectedRoute requireRole="admin"><Tools /></ProtectedRoute>} />
            <Route path="/admin/tool-matrix" element={<ProtectedRoute requireRole="admin"><ToolMatrix /></ProtectedRoute>} />
            <Route path="/admin/saved-benchmarks" element={<ProtectedRoute requireRole="admin"><SavedBenchmarks /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute requireRole="admin"><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/reports/:id" element={<ProtectedRoute requireRole="admin"><AdminReportEditor /></ProtectedRoute>} />
            <Route path="/admin/rgs-review-queue" element={<ProtectedRoute requireRole="admin"><RgsReviewQueuePage /></ProtectedRoute>} />
            <Route path="/admin/integration-planning" element={<ProtectedRoute requireRole="admin"><IntegrationPlanning /></ProtectedRoute>} />
            <Route path="/admin/imports" element={<ProtectedRoute requireRole="admin"><AdminImports /></ProtectedRoute>} />
            <Route path="/admin/scorecard-leads" element={<ProtectedRoute requireRole="admin"><AdminScorecardLeads /></ProtectedRoute>} />
            {/* P12.4 — Unified admin workspaces */}
            <Route path="/admin/diagnostic-workspace" element={<ProtectedRoute requireRole="admin"><DiagnosticWorkspace /></ProtectedRoute>} />
            <Route path="/admin/implementation-workspace" element={<ProtectedRoute requireRole="admin"><ImplementationWorkspace /></ProtectedRoute>} />
            {/* RGS OS locked domain routes */}
            <Route path="/admin/crm-pipeline" element={<ProtectedRoute requireRole="admin"><CRMPipelineDomain /></ProtectedRoute>} />
            <Route path="/admin/client-management" element={<ProtectedRoute requireRole="admin"><ClientManagementDomain /></ProtectedRoute>} />
            <Route path="/admin/tool-distribution" element={<ProtectedRoute requireRole="admin"><ToolDistributionDomain /></ProtectedRoute>} />
            <Route path="/admin/scorecard-system" element={<ProtectedRoute requireRole="admin"><ScorecardSystemDomain /></ProtectedRoute>} />
            <Route path="/admin/diagnostic-system" element={<ProtectedRoute requireRole="admin"><DiagnosticSystemDomain /></ProtectedRoute>} />
            <Route path="/admin/operations-sop" element={<ProtectedRoute requireRole="admin"><OperationsSOPDomain /></ProtectedRoute>} />
            <Route path="/admin/revenue-financials" element={<ProtectedRoute requireRole="admin"><RevenueFinancialsDomain /></ProtectedRoute>} />
            <Route path="/admin/add-on-monitoring" element={<ProtectedRoute requireRole="admin"><AddOnMonitoringDomain /></ProtectedRoute>} />
            {/* P4.3 Canonical cleanup — legacy `/admin/business-control-center/*` redirects
                to canonical `/admin/rgs-business-control-center/*`. Do not re-add a
                separate admin BCC page; the legacy file is a deprecated wrapper. */}
            <Route path="/admin/business-control-center" element={<Navigate to="/admin/rgs-business-control-center" replace />} />
            <Route path="/admin/business-control-center/:module" element={<LegacyAdminBccRedirect />} />
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
            <Route path="/portal/tools/revenue-review" element={<ProtectedRoute><RevenueReviewSync /></ProtectedRoute>} />
            {/* RGS OS portal domain routes */}
            <Route path="/portal/diagnostics" element={<ProtectedRoute><PortalDiagnostics /></ProtectedRoute>} />
            <Route path="/portal/scorecard" element={<ProtectedRoute><PortalScorecard /></ProtectedRoute>} />
            <Route path="/portal/monitoring" element={<ProtectedRoute><PortalMonitoring /></ProtectedRoute>} />
            <Route path="/portal/business-control-center" element={<ProtectedRoute><RccGate><PortalBusinessControlCenter /></RccGate></ProtectedRoute>} />
            <Route path="/portal/business-control-center/revenue-tracker" element={<ProtectedRoute><RccGate><ClientRevenueTrackerPage /></RccGate></ProtectedRoute>} />
            <Route path="/portal/reports" element={<ProtectedRoute><ClientReports /></ProtectedRoute>} />
            <Route path="/portal/reports/:id" element={<ProtectedRoute><ClientReportView /></ProtectedRoute>} />
            <Route path="/portal/business-control-center/:module" element={<ProtectedRoute><RccGate><PortalBusinessControlCenter /></RccGate></ProtectedRoute>} />
            {/* P4.3: `/portal/resources` and `/portal/worksheets` are alias wrappers
                that render the canonical `MyTools` page (`/portal/tools`). They exist
                to honour older links/nav labels and intentionally have no unique logic. */}
            <Route path="/portal/resources" element={<ProtectedRoute><MyTools /></ProtectedRoute>} />
            <Route path="/portal/worksheets" element={<ProtectedRoute><MyTools /></ProtectedRoute>} />
            <Route path="/portal/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
            <Route path="/portal/uploads" element={<ProtectedRoute><Uploads /></ProtectedRoute>} />
            <Route path="/portal/imports" element={<ProtectedRoute><ClientImports /></ProtectedRoute>} />
            {/* P12.4 — Unified client diagnostic input workspace */}
            <Route path="/portal/provide-data" element={<ProtectedRoute><ProvideData /></ProtectedRoute>} />
            <Route path="/portal/connected-sources" element={<ProtectedRoute><ConnectedSources /></ProtectedRoute>} />
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

/* P4.3 — Tiny wrapper that preserves the `:module` segment when redirecting
   from the legacy admin BCC route to the canonical RGS BCC route. */
function LegacyAdminBccRedirect() {
  const { module } = useParams();
  return <Navigate to={`/admin/rgs-business-control-center/${module ?? ""}`} replace />;
}
