
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CalendarProvider } from "@/contexts/CalendarContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import FAQ from "./pages/FAQ";
import WhyUs from "./pages/WhyUs";
import SeeHowItWorks from "./pages/SeeHowItWorks";
import Testing from "./pages/Testing";
import Conversations from "./pages/Conversations";
import Calendar from "./pages/Calendar";
import Dashboard from "./pages/Dashboard";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CalendarProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/why-us" element={<WhyUs />} />
              <Route path="/how-it-works" element={<SeeHowItWorks />} />
              <Route path="/testing" element={<Testing />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CalendarProvider>
    </QueryClientProvider>
  );
}

export default App;
