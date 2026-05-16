import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import ScrollToTop from "./components/ScrollToTop";
// P8.2 Problem-led SEO hub + spokes (public site only)
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/portal/ProtectedRoute";
import RccGate from "./components/portal/RccGate";
import AdminToolDirectoryPage from "./pages/admin/AdminToolDirectoryPage";
import RgsGuideBot from "./components/guideBot/RgsGuideBot";
// RGS OS domain pages
// P12.4 — Unified workspaces (consolidation pass)
import { ClientToolGuard } from "./components/portal/ClientToolGuard";

const ImplementationRoadmapAdmin = lazy(() => import("./pages/admin/ImplementationRoadmapAdmin"));
const SopTrainingBibleAdmin = lazy(() => import("./pages/admin/SopTrainingBibleAdmin"));
const DecisionRightsAccountabilityAdmin = lazy(() => import("./pages/admin/DecisionRightsAccountabilityAdmin"));
const WorkflowProcessMappingAdmin = lazy(() => import("./pages/admin/WorkflowProcessMappingAdmin"));
const ToolAssignmentTrainingTrackerAdmin = lazy(() => import("./pages/admin/ToolAssignmentTrainingTrackerAdmin"));
const RgsControlSystemAdmin = lazy(() => import("./pages/admin/RgsControlSystemAdmin"));
const CampaignControlAdmin = lazy(() => import("./pages/admin/CampaignControl"));
const RgsMarketingControl = lazy(() => import("./pages/admin/RgsMarketingControl"));
const Index = lazy(() => import("./pages/Index"));
const WhatWeDo = lazy(() => import("./pages/WhatWeDo"));
const SystemPage = lazy(() => import("./pages/System"));
const Diagnostic = lazy(() => import("./pages/Diagnostic"));
const DiagnosticInterview = lazy(() => import("./pages/DiagnosticInterview"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Scorecard = lazy(() => import("./pages/Scorecard"));
const DiagnosticScorecardTool = lazy(
  () => import("./pages/diagnostic/StabilityScorecardTool"),
);
const Start = lazy(() => import("./pages/Start"));
const Scan = lazy(() => import("./pages/Scan"));
const DiagnosticOffer = lazy(() => import("./pages/DiagnosticOffer"));
const DiagnosticApply = lazy(() => import("./pages/DiagnosticApply"));
const ClaimInvite = lazy(() => import("./pages/ClaimInvite"));
const Implementation = lazy(() => import("./pages/Implementation"));
const RevenueControlSystem = lazy(() => import("./pages/RevenueControlSystem"));
const Demo = lazy(() => import("./pages/Demo"));
const WhyRGSIsDifferent = lazy(() => import("./pages/WhyRGSIsDifferent"));
const WhyBusinessesLoseRevenue = lazy(() => import("./pages/insights/WhyBusinessesLoseRevenue"));
const IdentifyIdealCustomer = lazy(() => import("./pages/insights/IdentifyIdealCustomer"));
const TrackRevenueCashFlowWeekly = lazy(() => import("./pages/insights/TrackRevenueCashFlowWeekly"));
const LosingCustomersBeforeTheyBuy = lazy(() => import("./pages/insights/LosingCustomersBeforeTheyBuy"));
const MeasureBusinessStability = lazy(() => import("./pages/insights/MeasureBusinessStability"));
const FixOperationalBottlenecks = lazy(() => import("./pages/insights/FixOperationalBottlenecks"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPostPage = lazy(() => import("./pages/BlogPost"));
const Industries = lazy(() => import("./pages/industries/Industries"));
const IndustryLanding = lazy(() => import("./pages/industries/IndustryLanding"));
const IndustryBrainEducation = lazy(() => import("./pages/IndustryBrainEducation"));
const Auth = lazy(() => import("./pages/portal/Auth"));
const PortalAccessPending = lazy(() => import("./pages/portal/PortalAccessPending"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const StandaloneToolRunnerPage = lazy(() => import("./pages/admin/StandaloneToolRunner"));
const AdminDiagnosticInterviews = lazy(() => import("./pages/admin/DiagnosticInterviews"));
const AdminDiagnosticInterviewDetail = lazy(() => import("./pages/admin/DiagnosticInterviewDetail"));
const IndustryDiagnosticInterviews = lazy(() => import("./pages/admin/IndustryDiagnosticInterviews"));
const IndustryDiagnosticInterviewRunner = lazy(() => import("./pages/admin/IndustryDiagnosticInterviewRunner"));
const Customers = lazy(() => import("./pages/admin/Customers"));
const CustomerDetail = lazy(() => import("./pages/admin/CustomerDetail"));
const Tools = lazy(() => import("./pages/admin/Tools"));
const ToolMatrix = lazy(() => import("./pages/admin/ToolMatrix"));
const ToolCatalogPage = lazy(() => import("./pages/admin/ToolCatalog"));
const Files = lazy(() => import("./pages/admin/Files"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const Tasks = lazy(() => import("./pages/admin/Tasks"));
const Templates = lazy(() => import("./pages/admin/Templates"));
const Reporting = lazy(() => import("./pages/admin/Reporting"));
const AdminOutcomes = lazy(() => import("./pages/admin/Outcomes"));
const StabilityScorecardTool = lazy(() => import("./pages/admin/tools/StabilityScorecard"));
const RevenueLeakFinderTool = lazy(() => import("./pages/admin/tools/RevenueLeakFinder"));
const IntelligenceDemo = lazy(() => import("./pages/admin/IntelligenceDemo"));
const PersonaBuilderTool = lazy(() => import("./pages/admin/tools/PersonaBuilder"));
const JourneyMapperTool = lazy(() => import("./pages/admin/tools/JourneyMapper"));
const ProcessBreakdownTool = lazy(() => import("./pages/admin/tools/ProcessBreakdown"));
const CustomerDashboard = lazy(() => import("./pages/portal/CustomerDashboard"));
const MyTools = lazy(() => import("./pages/portal/MyTools"));
const ProgressPage = lazy(() => import("./pages/portal/Progress"));
const Account = lazy(() => import("./pages/portal/Account"));
const Uploads = lazy(() => import("./pages/portal/Uploads"));
const ClientSelfAssessment = lazy(() => import("./pages/portal/tools/SelfAssessment"));
const ImplementationTracker = lazy(() => import("./pages/portal/tools/ImplementationTracker"));
const ImplementationRoadmap = lazy(() => import("./pages/portal/tools/ImplementationRoadmap"));
const SopTrainingBible = lazy(() => import("./pages/portal/tools/SopTrainingBible"));
const DecisionRightsAccountability = lazy(() => import("./pages/portal/tools/DecisionRightsAccountability"));
const WorkflowProcessMapping = lazy(() => import("./pages/portal/tools/WorkflowProcessMapping"));
const ToolAssignmentTrainingTracker = lazy(() => import("./pages/portal/tools/ToolAssignmentTrainingTracker"));
const RgsControlSystem = lazy(() => import("./pages/portal/tools/RgsControlSystem"));
const CampaignControl = lazy(() => import("./pages/portal/tools/CampaignControl"));
const WeeklyReflection = lazy(() => import("./pages/portal/tools/WeeklyReflection"));
const RevenueRiskMonitor = lazy(() => import("./pages/portal/tools/RevenueRiskMonitor"));
const RevenueRiskMonitorAdmin = lazy(() => import("./pages/admin/RevenueRiskMonitorAdmin"));
const PriorityActionTracker = lazy(() => import("./pages/portal/tools/PriorityActionTracker"));
const PriorityActionTrackerAdmin = lazy(() => import("./pages/admin/PriorityActionTrackerAdmin"));
const OwnerDecisionDashboard = lazy(() => import("./pages/portal/tools/OwnerDecisionDashboard"));
const OwnerDecisionDashboardAdmin = lazy(() => import("./pages/admin/OwnerDecisionDashboardAdmin"));
const ScorecardHistory = lazy(() => import("./pages/portal/tools/ScorecardHistory"));
const ScorecardHistoryAdmin = lazy(() => import("./pages/admin/ScorecardHistoryAdmin"));
const MonthlySystemReview = lazy(() => import("./pages/portal/tools/MonthlySystemReview"));
const MonthlySystemReviewAdmin = lazy(() => import("./pages/admin/MonthlySystemReviewAdmin"));
const ToolLibrary = lazy(() => import("./pages/portal/tools/ToolLibrary"));
const ToolLibraryAdmin = lazy(() => import("./pages/admin/ToolLibraryAdmin"));
const AdvisoryNotes = lazy(() => import("./pages/portal/tools/AdvisoryNotes"));
const AdvisoryNotesAdmin = lazy(() => import("./pages/admin/AdvisoryNotesAdmin"));
const SwotAnalysis = lazy(() => import("./pages/portal/tools/SwotAnalysis"));
const SwotAnalysisAdmin = lazy(() => import("./pages/admin/SwotAnalysisAdmin"));
const SwotStrategicMatrixAdmin = lazy(() => import("./pages/admin/SwotStrategicMatrixAdmin"));
const SwotStrategicMatrix = lazy(() => import("./pages/portal/tools/SwotStrategicMatrix"));
const FinancialVisibility = lazy(() => import("./pages/portal/tools/FinancialVisibility"));
const FinancialVisibilityAdmin = lazy(() => import("./pages/admin/FinancialVisibilityAdmin"));
const IndustryBrainAdmin = lazy(() => import("./pages/admin/IndustryBrainAdmin"));
const ClientHealthAdmin = lazy(() => import("./pages/admin/ClientHealthAdmin"));
const ClientHealthOverview = lazy(() => import("./pages/admin/ClientHealthOverview"));
const RevenueLeakEngineClient = lazy(() => import("./pages/portal/tools/RevenueLeakEngine"));
const RevenueReviewSync = lazy(() => import("./pages/portal/tools/RevenueReviewSync"));
const OwnerDiagnosticInterview = lazy(() => import("./pages/portal/tools/OwnerDiagnosticInterview"));
const CostOfFrictionCalculatorPage = lazy(() => import("./pages/portal/tools/CostOfFrictionCalculator"));
const StabilityToValueLensPage = lazy(() => import("./pages/portal/tools/StabilityToValueLens"));
const CRMPipelineDomain = lazy(() => import("./pages/admin/domains/CRMPipeline"));
const ClientManagementDomain = lazy(() => import("./pages/admin/domains/ClientManagement"));
const ToolDistributionDomain = lazy(() => import("./pages/admin/domains/ToolDistribution"));
const ScorecardSystemDomain = lazy(() => import("./pages/admin/domains/ScorecardSystem"));
const DiagnosticSystemDomain = lazy(() => import("./pages/admin/domains/DiagnosticSystem"));
const OperationsSOPDomain = lazy(() => import("./pages/admin/domains/OperationsSOP"));
const RevenueFinancialsDomain = lazy(() => import("./pages/admin/domains/RevenueFinancials"));
const AddOnMonitoringDomain = lazy(() => import("./pages/admin/domains/AddOnMonitoring"));
const PortalDiagnostics = lazy(() => import("./pages/portal/Diagnostics"));
const PortalScorecard = lazy(() => import("./pages/portal/Scorecard"));
const PortalMonitoring = lazy(() => import("./pages/portal/Monitoring"));
const PortalBusinessControlCenter = lazy(() => import("./pages/portal/BusinessControlCenter"));
const ClientRevenueTrackerPage = lazy(() => import("./pages/portal/ClientRevenueTrackerPage"));
const RgsBusinessControlCenter = lazy(() => import("./pages/admin/domains/RgsBusinessControlCenter"));
const AdminClientBusinessControl = lazy(() => import("./pages/admin/ClientBusinessControl"));
const PendingAccounts = lazy(() => import("./pages/admin/PendingAccounts"));
const DiagnosticOrders = lazy(() => import("./pages/admin/DiagnosticOrders"));
const AdminOffers = lazy(() => import("./pages/admin/Offers"));
const AdminPayments = lazy(() => import("./pages/admin/Payments"));
const ServiceRequests = lazy(() => import("./pages/admin/ServiceRequests"));
const SavedBenchmarks = lazy(() => import("./pages/admin/SavedBenchmarks"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminReportEditor = lazy(() => import("./pages/admin/ReportEditor"));
const ClientReports = lazy(() => import("./pages/portal/Reports"));
const ClientReportView = lazy(() => import("./pages/portal/ReportView"));
const RgsReviewQueuePage = lazy(() => import("./pages/admin/RgsReviewQueue"));
const IntegrationPlanning = lazy(() => import("./pages/admin/IntegrationPlanning"));
const AdminImports = lazy(() => import("./pages/admin/Imports"));
const ClientImports = lazy(() => import("./pages/portal/Imports"));
const ProvideData = lazy(() => import("./pages/portal/ProvideData"));
const DiagnosticWorkspace = lazy(() => import("./pages/admin/domains/DiagnosticWorkspace"));
const ImplementationWorkspace = lazy(() => import("./pages/admin/domains/ImplementationWorkspace"));
const ConnectedSources = lazy(() => import("./pages/portal/ConnectedSources"));
const PriorityTasks = lazy(() => import("./pages/portal/PriorityTasks"));
const Eula = lazy(() => import("./pages/Eula"));
const Privacy = lazy(() => import("./pages/Privacy"));
const AdminScorecardLeads = lazy(() => import("./pages/admin/ScorecardLeads"));
const AdminScanLeads = lazy(() => import("./pages/admin/ScanLeads"));
const AdminGigCustomers = lazy(() => import("./pages/admin/GigCustomers"));
const AdminReportDrafts = lazy(() => import("./pages/admin/ReportDrafts"));
const AdminReportDraftDetail = lazy(() => import("./pages/admin/ReportDraftDetail"));
const SystemReadiness = lazy(() => import("./pages/admin/SystemReadiness"));
const WalkthroughVideosAdmin = lazy(() => import("./pages/admin/WalkthroughVideosAdmin"));

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
            <RgsGuideBot />
            <Suspense fallback={<div className="min-h-screen bg-background" aria-label="Loading page" />}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/what-we-do" element={<WhatWeDo />} />
            <Route path="/system" element={<SystemPage />} />
            {/* P96D — Public /scorecard redirects to the Operational Friction
                Scan. The full Business Stability Scorecard is mounted as
                Diagnostic Part 1 at /diagnostic/scorecard behind auth. */}
            <Route path="/scorecard" element={<Scorecard />} />
            <Route path="/revenue-scorecard" element={<Navigate to="/scan" replace />} />
            <Route
              path="/diagnostic/scorecard"
              element={
                <ProtectedRoute>
                  <DiagnosticScorecardTool />
                </ProtectedRoute>
              }
            />
            <Route path="/scan" element={<Scan />} />
            <Route path="/start" element={<Start />} />
            <Route path="/diagnostic" element={<Diagnostic />} />
            <Route path="/diagnostic-interview" element={<DiagnosticInterview />} />
            {/* P8.1: `/diagnostic-offer` is the legacy alternate diagnostic page.
                Funnel is consolidated to `/diagnostic`; this route now redirects
                to the canonical page. The component is kept available in case a
                future split test wants to restore it. */}
            <Route path="/diagnostic-offer" element={<Navigate to="/diagnostic" replace />} />
            <Route path="/diagnostic-offer-legacy" element={<DiagnosticOffer />} />
            <Route path="/diagnostic-apply" element={<DiagnosticApply />} />
            <Route path="/implementation" element={<Implementation />} />
            <Route path="/revenue-control-system" element={<RevenueControlSystem />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/why-rgs-is-different" element={<WhyRGSIsDifferent />} />
            {/* P8.2 — Problem-led SEO hub + spoke pages. Public-only,
                no nav clutter; surfaced via footer "Insights" column,
                hub-spoke cross-links, and spoke→hub back-links. */}
            <Route path="/why-businesses-lose-revenue" element={<WhyBusinessesLoseRevenue />} />
            <Route path="/identify-ideal-customer" element={<IdentifyIdealCustomer />} />
            <Route path="/track-revenue-cash-flow-weekly" element={<TrackRevenueCashFlowWeekly />} />
            <Route path="/losing-customers-before-they-buy" element={<LosingCustomersBeforeTheyBuy />} />
            <Route path="/measure-business-stability" element={<MeasureBusinessStability />} />
            <Route path="/fix-operational-bottlenecks" element={<FixOperationalBottlenecks />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/industries/:slug" element={<IndustryLanding />} />
            <Route path="/industry-brain" element={<IndustryBrainEducation />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/eula" element={<Eula />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/claim-invite" element={<ClaimInvite />} />
            <Route path="/portal-access-pending" element={<ProtectedRoute><PortalAccessPending /></ProtectedRoute>} />
            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute requireRole="admin"><AdminDashboard /></ProtectedRoute>} />
           <Route path="/admin/tool-directory" element={<ProtectedRoute requireRole="admin"><AdminToolDirectoryPage /></ProtectedRoute>} />
            <Route path="/admin/standalone-tool-runner" element={<ProtectedRoute requireRole="admin"><StandaloneToolRunnerPage /></ProtectedRoute>} />
            {/* P12.4.B.UI: Legacy flow-chart Pipeline page removed; /admin/pipeline now redirects to the lifecycle board. */}
            <Route path="/admin/pipeline" element={<Navigate to="/admin/customers" replace />} />
            <Route path="/admin/customers" element={<ProtectedRoute requireRole="admin"><Customers /></ProtectedRoute>} />
            <Route path="/admin/customers/:id" element={<ProtectedRoute requireRole="admin"><CustomerDetail /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/implementation-roadmap" element={<ProtectedRoute requireRole="admin"><ImplementationRoadmapAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/sop-training-bible" element={<ProtectedRoute requireRole="admin"><SopTrainingBibleAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/decision-rights-accountability" element={<ProtectedRoute requireRole="admin"><DecisionRightsAccountabilityAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/workflow-process-mapping" element={<ProtectedRoute requireRole="admin"><WorkflowProcessMappingAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/revenue-risk-monitor" element={<ProtectedRoute requireRole="admin"><RevenueRiskMonitorAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/priority-action-tracker" element={<ProtectedRoute requireRole="admin"><PriorityActionTrackerAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/owner-decision-dashboard" element={<ProtectedRoute requireRole="admin"><OwnerDecisionDashboardAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/scorecard-history" element={<ProtectedRoute requireRole="admin"><ScorecardHistoryAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/monthly-system-review" element={<ProtectedRoute requireRole="admin"><MonthlySystemReviewAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/tool-library" element={<ProtectedRoute requireRole="admin"><ToolLibraryAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/advisory-notes" element={<ProtectedRoute requireRole="admin"><AdvisoryNotesAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/swot-analysis" element={<ProtectedRoute requireRole="admin"><SwotAnalysisAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/swot-strategic-matrix" element={<ProtectedRoute requireRole="admin"><SwotStrategicMatrixAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/financial-visibility" element={<ProtectedRoute requireRole="admin"><FinancialVisibilityAdmin /></ProtectedRoute>} />
            <Route path="/admin/client-health" element={<ProtectedRoute requireRole="admin"><ClientHealthOverview /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/client-health" element={<ProtectedRoute requireRole="admin"><ClientHealthAdmin /></ProtectedRoute>} />
            <Route path="/admin/industry-brain" element={<ProtectedRoute requireRole="admin"><IndustryBrainAdmin /></ProtectedRoute>} />
            <Route path="/admin/walkthrough-videos" element={<ProtectedRoute requireRole="admin"><WalkthroughVideosAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/tool-assignment-training-tracker" element={<ProtectedRoute requireRole="admin"><ToolAssignmentTrainingTrackerAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/rgs-control-system" element={<ProtectedRoute requireRole="admin"><RgsControlSystemAdmin /></ProtectedRoute>} />
            <Route path="/admin/customers/:customerId/campaign-control" element={<ProtectedRoute requireRole="admin"><CampaignControlAdmin /></ProtectedRoute>} />
            <Route path="/admin/campaign-control" element={<ProtectedRoute requireRole="admin"><CampaignControlAdmin /></ProtectedRoute>} />
            <Route path="/admin/rgs-marketing-control" element={<ProtectedRoute requireRole="admin"><RgsMarketingControl /></ProtectedRoute>} />
            <Route path="/admin/clients/:id/business-control" element={<ProtectedRoute requireRole="admin"><AdminClientBusinessControl /></ProtectedRoute>} />
            <Route path="/admin/pending-accounts" element={<ProtectedRoute requireRole="admin"><PendingAccounts /></ProtectedRoute>} />
            <Route path="/admin/new-accounts" element={<ProtectedRoute requireRole="admin"><PendingAccounts /></ProtectedRoute>} />
            <Route path="/admin/diagnostic-orders" element={<ProtectedRoute requireRole="admin"><DiagnosticOrders /></ProtectedRoute>} />
            <Route path="/admin/offers" element={<ProtectedRoute requireRole="admin"><AdminOffers /></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute requireRole="admin"><AdminPayments /></ProtectedRoute>} />
            <Route path="/admin/service-requests" element={<ProtectedRoute requireRole="admin"><ServiceRequests /></ProtectedRoute>} />
            {/* P31 — Cross-customer outcome review queue */}
            <Route path="/admin/outcomes" element={<ProtectedRoute requireRole="admin"><AdminOutcomes /></ProtectedRoute>} />
            <Route path="/admin/tools" element={<ProtectedRoute requireRole="admin"><Tools /></ProtectedRoute>} />
            <Route path="/admin/tool-matrix" element={<ProtectedRoute requireRole="admin"><ToolMatrix /></ProtectedRoute>} />
            <Route path="/admin/tool-catalog" element={<ProtectedRoute requireRole="admin"><ToolCatalogPage /></ProtectedRoute>} />
            <Route path="/admin/saved-benchmarks" element={<ProtectedRoute requireRole="admin"><SavedBenchmarks /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute requireRole="admin"><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/reports/:id" element={<ProtectedRoute requireRole="admin"><AdminReportEditor /></ProtectedRoute>} />
            <Route path="/admin/rgs-review-queue" element={<ProtectedRoute requireRole="admin"><RgsReviewQueuePage /></ProtectedRoute>} />
            <Route path="/admin/integration-planning" element={<ProtectedRoute requireRole="admin"><IntegrationPlanning /></ProtectedRoute>} />
            <Route path="/admin/imports" element={<ProtectedRoute requireRole="admin"><AdminImports /></ProtectedRoute>} />
            <Route path="/admin/scorecard-leads" element={<ProtectedRoute requireRole="admin"><AdminScorecardLeads /></ProtectedRoute>} />
            <Route path="/admin/scan-leads" element={<ProtectedRoute requireRole="admin"><AdminScanLeads /></ProtectedRoute>} />
            <Route path="/admin/gig-customers" element={<ProtectedRoute requireRole="admin"><AdminGigCustomers /></ProtectedRoute>} />
            <Route path="/admin/diagnostic-interviews" element={<ProtectedRoute requireRole="admin"><AdminDiagnosticInterviews /></ProtectedRoute>} />
            <Route path="/admin/diagnostic-interviews/:id" element={<ProtectedRoute requireRole="admin"><AdminDiagnosticInterviewDetail /></ProtectedRoute>} />
            <Route path="/admin/industry-interviews" element={<ProtectedRoute requireRole="admin"><IndustryDiagnosticInterviews /></ProtectedRoute>} />
            <Route path="/admin/industry-interviews/:id" element={<ProtectedRoute requireRole="admin"><IndustryDiagnosticInterviewRunner /></ProtectedRoute>} />
            <Route path="/admin/report-drafts" element={<ProtectedRoute requireRole="admin"><AdminReportDrafts /></ProtectedRoute>} />
            <Route path="/admin/report-drafts/:id" element={<ProtectedRoute requireRole="admin"><AdminReportDraftDetail /></ProtectedRoute>} />
            {/* P65 — convenience alias for the admin report generator scoped to a customer.
                Reuses the existing /admin/report-drafts builder rather than duplicating it. */}
            <Route
              path="/admin/customers/:customerId/reports"
              element={
                <ProtectedRoute requireRole="admin">
                  <CustomerReportsAlias />
                </ProtectedRoute>
              }
            />
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
            <Route path="/admin/intelligence-demo" element={<ProtectedRoute requireRole="admin"><IntelligenceDemo /></ProtectedRoute>} />
            <Route path="/admin/tools/persona-builder" element={<ProtectedRoute requireRole="admin"><PersonaBuilderTool /></ProtectedRoute>} />
            <Route path="/admin/tools/journey-mapper" element={<ProtectedRoute requireRole="admin"><JourneyMapperTool /></ProtectedRoute>} />
            <Route path="/admin/tools/process-breakdown" element={<ProtectedRoute requireRole="admin"><ProcessBreakdownTool /></ProtectedRoute>} />
            <Route path="/admin/worksheets" element={<ProtectedRoute requireRole="admin"><Tools /></ProtectedRoute>} />
            <Route path="/admin/templates" element={<ProtectedRoute requireRole="admin"><Templates /></ProtectedRoute>} />
            <Route path="/admin/tasks" element={<ProtectedRoute requireRole="admin"><Tasks /></ProtectedRoute>} />
            <Route path="/admin/reporting" element={<ProtectedRoute requireRole="admin"><Reporting /></ProtectedRoute>} />
            <Route path="/admin/files" element={<ProtectedRoute requireRole="admin"><Files /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requireRole="admin"><Settings /></ProtectedRoute>} />
            <Route path="/admin/system-readiness" element={<ProtectedRoute requireRole="admin"><SystemReadiness /></ProtectedRoute>} />
            {/* Customer portal */}
            <Route path="/portal" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/portal/tools" element={<ProtectedRoute><MyTools /></ProtectedRoute>} />
            <Route path="/portal/tools/owner-diagnostic-interview" element={<ProtectedRoute><OwnerDiagnosticInterview /></ProtectedRoute>} />
            <Route path="/portal/tools/self-assessment" element={<ProtectedRoute><ClientToolGuard toolKey="implementation_foundation_system"><ClientSelfAssessment /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/implementation-tracker" element={<ProtectedRoute><ClientToolGuard toolKey="implementation_command_tracker"><ImplementationTracker /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/implementation-roadmap" element={<ProtectedRoute><ClientToolGuard toolKey="implementation_roadmap"><ImplementationRoadmap /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/sop-training-bible" element={<ProtectedRoute><ClientToolGuard toolKey="sop_training_bible"><SopTrainingBible /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/decision-rights-accountability" element={<ProtectedRoute><ClientToolGuard toolKey="decision_rights_accountability"><DecisionRightsAccountability /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/workflow-process-mapping" element={<ProtectedRoute><ClientToolGuard toolKey="workflow_process_mapping"><WorkflowProcessMapping /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/tool-assignment-training-tracker" element={<ProtectedRoute><ClientToolGuard toolKey="tool_assignment_training_tracker"><ToolAssignmentTrainingTracker /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/rgs-control-system" element={<ProtectedRoute><ClientToolGuard toolKey="rgs_control_system"><RgsControlSystem /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/campaign-control" element={<ProtectedRoute><ClientToolGuard toolKey="campaign_control_system"><CampaignControl /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/weekly-reflection" element={<ProtectedRoute><ClientToolGuard toolKey="weekly_alignment_system"><WeeklyReflection /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/revenue-risk-monitor" element={<ProtectedRoute><ClientToolGuard toolKey="revenue_risk_monitor"><RevenueRiskMonitor /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/cost-of-friction" element={<ProtectedRoute><ClientToolGuard toolKey="cost_of_friction_calculator"><CostOfFrictionCalculatorPage /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/stability-to-value-lens" element={<ProtectedRoute><ClientToolGuard toolKey="stability_to_value_lens"><StabilityToValueLensPage /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/priority-action-tracker" element={<ProtectedRoute><ClientToolGuard toolKey="priority_action_tracker"><PriorityActionTracker /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/owner-decision-dashboard" element={<ProtectedRoute><ClientToolGuard toolKey="owner_decision_dashboard"><OwnerDecisionDashboard /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/scorecard-history" element={<ProtectedRoute><ClientToolGuard toolKey="scorecard_history_tracker"><ScorecardHistory /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/monthly-system-review" element={<ProtectedRoute><ClientToolGuard toolKey="monthly_system_review"><MonthlySystemReview /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/tool-library" element={<ProtectedRoute><ClientToolGuard toolKey="tool_library_resource_center"><ToolLibrary /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/advisory-notes" element={<ProtectedRoute><ClientToolGuard toolKey="advisory_notes_clarification_log"><AdvisoryNotes /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/swot-analysis" element={<ProtectedRoute><ClientToolGuard toolKey="swot_analysis_tool"><SwotAnalysis /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/swot-strategic-matrix" element={<ProtectedRoute><ClientToolGuard toolKey="swot_analysis_tool"><SwotStrategicMatrix /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/financial-visibility" element={<ProtectedRoute><ClientToolGuard toolKey="connector_financial_visibility"><FinancialVisibility /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/tools/revenue-leak-engine" element={<ProtectedRoute><RevenueLeakEngineClient /></ProtectedRoute>} />
            <Route path="/portal/tools/revenue-review" element={<ProtectedRoute><RevenueReviewSync /></ProtectedRoute>} />
            {/* RGS OS portal domain routes */}
            <Route path="/portal/diagnostics" element={<ProtectedRoute><PortalDiagnostics /></ProtectedRoute>} />
            <Route path="/portal/scorecard" element={<ProtectedRoute><ClientToolGuard toolKey="scorecard"><PortalScorecard /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/monitoring" element={<ProtectedRoute><PortalMonitoring /></ProtectedRoute>} />
            <Route path="/portal/business-control-center" element={<ProtectedRoute><RccGate><PortalBusinessControlCenter /></RccGate></ProtectedRoute>} />
            <Route path="/portal/business-control-center/revenue-tracker" element={<ProtectedRoute><RccGate><ClientToolGuard toolKey="revenue_tracker"><ClientRevenueTrackerPage /></ClientToolGuard></RccGate></ProtectedRoute>} />
            <Route path="/portal/reports" element={<ProtectedRoute><ClientToolGuard toolKey="reports_and_reviews"><ClientReports /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/reports/:id" element={<ProtectedRoute><ClientReportView /></ProtectedRoute>} />
            <Route path="/portal/business-control-center/:module" element={<ProtectedRoute><RccGate><PortalBusinessControlCenter /></RccGate></ProtectedRoute>} />
            {/* P4.3: `/portal/resources` and `/portal/worksheets` are alias wrappers
                that render the canonical `MyTools` page (`/portal/tools`). They exist
                to honour older links/nav labels and intentionally have no unique logic. */}
            <Route path="/portal/resources" element={<ProtectedRoute><MyTools /></ProtectedRoute>} />
            <Route path="/portal/worksheets" element={<ProtectedRoute><MyTools /></ProtectedRoute>} />
            <Route path="/portal/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
            <Route path="/portal/uploads" element={<ProtectedRoute><ClientToolGuard toolKey="evidence_uploads"><Uploads /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/imports" element={<ProtectedRoute><ClientImports /></ProtectedRoute>} />
            {/* P12.4 — Unified client diagnostic input workspace */}
            <Route path="/portal/provide-data" element={<ProtectedRoute><ProvideData /></ProtectedRoute>} />
            <Route path="/portal/connected-sources" element={<ProtectedRoute><ClientToolGuard toolKey="quickbooks_sync_health"><ConnectedSources /></ClientToolGuard></ProtectedRoute>} />
            <Route path="/portal/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/portal/priority-tasks" element={<ProtectedRoute><ClientToolGuard toolKey="priority_tasks"><PriorityTasks /></ClientToolGuard></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
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

/* P65 — Convenience alias: redirects /admin/customers/:customerId/reports to
   the existing admin report builder, preselecting the customer. We reuse the
   established /admin/report-drafts surface rather than create a duplicate. */
function CustomerReportsAlias() {
  const { customerId } = useParams();
  return (
    <Navigate
      to={`/admin/report-drafts${customerId ? `?customer=${customerId}` : ""}`}
      replace
    />
  );
}
