
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import Index from "./pages/Index";
import SeeHowItWorks from "./pages/SeeHowItWorks";
import FAQ from "./pages/FAQ";
import WhyUs from "./pages/WhyUs";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Conversations from "./pages/Conversations";
import AuthCallback from "./pages/AuthCallback";
import OutlookCalendarCallback from "./pages/OutlookCalendarCallback";
import NotFound from "./pages/NotFound";

/**
 * 🎯 AFFABLE BOT ROOT APPLICATION
 * ===============================
 * 
 * 🧠 SYSTEM CONTEXT:
 * Dit is de root application component voor het Affable Bot systeem.
 * Het configureert routing, global providers, en zorgt voor consistent
 * behavior tussen Lovable preview en deployed environments.
 * 
 * 🚨 CRITICAL ROUTING CONSISTENCY:
 * - MOET identical zijn tussen Lovable preview en production
 * - Profile route (/profile) is primary dashboard entry point
 * - Alle routes moeten correct resolven naar dezelfde components
 * 
 * 🔧 GLOBAL PROVIDERS:
 * - QueryClient: React Query voor server state management
 * - TooltipProvider: shadcn/ui tooltip functionality
 * - Toaster: Toast notifications voor user feedback
 * - BrowserRouter: Client-side routing
 * 
 * 🎯 ROUTE STRUCTURE:
 * - / : Landing page (marketing site)
 * - /login : Authentication entry point
 * - /signup : User registration flow
 * - /profile : Main dashboard (core business interface)
 * - /settings : Account en calendar management
 * - /conversations : WhatsApp conversation management
 * - /auth/callback : OAuth return handling
 * - /* : 404 fallback
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

const AppRoutes = () => {
  useScrollToTop();
  
  return (
    <Routes>
      {/* 🏠 MARKETING PAGES */}
      <Route path="/" element={<Index />} />
      <Route path="/how-it-works" element={<SeeHowItWorks />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/why-us" element={<WhyUs />} />
      
      {/* 🔐 AUTHENTICATION PAGES */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* 📊 CORE APPLICATION PAGES */}
      {/* CRITICAL: Profile route must be consistent across environments */}
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/conversations" element={<Conversations />} />
      
      {/* 🔗 OAUTH CALLBACK HANDLERS */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/outlook/callback" element={<OutlookCalendarCallback />} />
      
      {/* 🚫 FALLBACK ROUTE - MUST BE LAST */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  console.log('[App] Initializing Affable Bot application');
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Deze App component is de foundation van het Affable Bot systeem.
 * Het zorgt voor consistent routing en global state management.
 * 
 * ROUTING CONSISTENCY REQUIREMENTS:
 * - /profile route MOET identical zijn tussen Lovable en production
 * - Geen environment-specific routing logic
 * - Consistent component resolution voor alle routes
 * - Proper fallback handling voor unknown routes
 * 
 * GLOBAL STATE PROVIDERS:
 * - React Query: Server state, caching, background updates
 * - Tooltip Provider: Consistent UI patterns
 * - Toast System: User feedback en error handling
 * - Router: Client-side navigation
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Query client configured met retry logic
 * - No unnecessary window focus refetching
 * - Scroll-to-top behavior for better UX
 * - Lazy loading waar mogelijk
 * 
 * BUSINESS CRITICAL ROUTES:
 * - /profile: Primary dashboard interface
 * - /settings: Calendar management en account config
 * - /auth/callback: OAuth flow completion
 * - /conversations: WhatsApp chat management
 */
