
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CalendarProvider } from "@/contexts/CalendarContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import FAQ from "./pages/FAQ";
import SeeHowItWorks from "./pages/SeeHowItWorks";
import WhyUs from "./pages/WhyUs";
import Conversations from "./pages/Conversations";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import Testing from "./pages/Testing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <CalendarProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/how-it-works" element={<SeeHowItWorks />} />
              <Route path="/why-us" element={<WhyUs />} />
              <Route path="/hoe-het-werkt" element={<SeeHowItWorks />} />
              <Route path="/waarom-ons" element={<WhyUs />} />
              <Route path="/gesprekken" element={<Conversations />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/testing" element={<Testing />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CalendarProvider>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
