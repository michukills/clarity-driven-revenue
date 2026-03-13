import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import BusinessMRI from "./pages/BusinessMRI";
import StabilityFramework from "./pages/StabilityFramework";
import HowRGSWorks from "./pages/HowRGSWorks";
import WhyRGSExists from "./pages/WhyRGSExists";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/business-mri" element={<BusinessMRI />} />
            <Route path="/stability-framework" element={<StabilityFramework />} />
            <Route path="/how-rgs-works" element={<HowRGSWorks />} />
            <Route path="/why-rgs-exists" element={<WhyRGSExists />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
