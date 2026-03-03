import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import Services from "./pages/Services";
import { MarketPositionPricing, LeadSalesSystem, RevenueTrackingForecasting, OperationalDiscipline } from "./pages/ServicePages";
import Contact from "./pages/Contact";
import Visibility from "./pages/framework/Visibility";
import Insights from "./pages/Insights";
import InsightArticle from "./pages/InsightArticle";
import RevenueScorecard from "./pages/RevenueScorecard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/market-position-pricing" element={<MarketPositionPricing />} />
          <Route path="/services/lead-sales-system" element={<LeadSalesSystem />} />
          <Route path="/services/revenue-tracking-forecasting" element={<RevenueTrackingForecasting />} />
          <Route path="/services/operational-discipline" element={<OperationalDiscipline />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/framework/visibility" element={<Visibility />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/insights/:slug" element={<InsightArticle />} />
          <Route path="/revenue-scorecard" element={<RevenueScorecard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
