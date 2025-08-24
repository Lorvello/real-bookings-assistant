
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarProvider } from '@/contexts/CalendarContext';
import { ConversationCalendarProvider } from '@/contexts/ConversationCalendarContext';
import { UserStatusProvider } from '@/contexts/UserStatusContext';
import { useEffect } from 'react';
import { useWebhookAutoProcessor } from '@/hooks/useWebhookAutoProcessor';
import { useAuth } from '@/hooks/useAuth';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import AuthCallback from '@/pages/AuthCallback';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import VerifyEmail from '@/pages/VerifyEmail';
import Testing from '@/pages/Testing';
import NotFound from '@/pages/NotFound';
import Settings from '@/pages/Settings';
import Availability from '@/pages/Availability';
import Conversations from '@/pages/Conversations';
import ConversationDetail from '@/pages/ConversationDetail';
import SeeHowItWorks from '@/pages/SeeHowItWorks';
import WhyUs from '@/pages/WhyUs';
import FAQ from '@/pages/FAQ';
import TestAIAgent from '@/pages/TestAIAgent';
import WhatsAppBookingAssistantPage from '@/pages/WhatsAppBookingAssistant';
import Profile from '@/pages/Profile';
import TeamInvite from '@/pages/TeamInvite';
import TermsOfService from '@/pages/TermsOfService';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Success from '@/pages/Success';

// Pages
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Calendar from '@/pages/Calendar';
import Bookings from '@/pages/Bookings';

const queryClient = new QueryClient();

// Global webhook processor component
function GlobalWebhookProcessor() {
  const { user } = useAuth();
  
  // Start global webhook auto-processor when user is authenticated
  useWebhookAutoProcessor({ 
    enabled: !!user,
    intervalMs: 3000 // Process every 3 seconds globally
  });

  return null; // This component doesn't render anything
}

// Redirect any Supabase recovery link to /reset-password
function RecoveryRedirector() {
  const navigate = useNavigate();
  useEffect(() => {
    const redirectIfRecovery = () => {
      const { pathname, search, hash } = window.location;
      const normalizedHash = hash === '#' ? '' : hash; // Treat lone '#' as empty

      const hasSupabaseTokens = (normalizedHash && (normalizedHash.includes('type=recovery') || normalizedHash.includes('access_token=') || normalizedHash.includes('refresh_token='))) ||
                          (search && (search.includes('type=recovery') || search.includes('access_token=') || search.includes('refresh_token=')));
      const hasAuthError = (normalizedHash && (normalizedHash.includes('error=') || normalizedHash.includes('error_code='))) ||
                          (search && (search.includes('error=') || search.includes('error_code=')));
      
      // Handle cases where Supabase redirects to homepage with an empty or lone '#' hash
      const isHomepageWithEmptyHash = pathname === '/' && !normalizedHash && !search;
      const mightBeFromEmail = isHomepageWithEmptyHash && 
                              ((document.referrer && (document.referrer.includes('supabase') || document.referrer.includes('/verify'))) ||
                               sessionStorage.getItem('password-reset-requested') === 'true');
      
      const needsRedirect = (hasSupabaseTokens || hasAuthError || mightBeFromEmail);
      const alreadyOnReset = pathname.includes('/reset-password');
      
      if (needsRedirect && !alreadyOnReset) {
        // Clear the marker to avoid loops once we navigate
        sessionStorage.removeItem('password-reset-requested');
        navigate(`/reset-password${search || ''}${normalizedHash || ''}`, { replace: true });
      }
    };
    redirectIfRecovery();
    window.addEventListener('hashchange', redirectIfRecovery);
    return () => window.removeEventListener('hashchange', redirectIfRecovery);
  }, [navigate]);
  return null;
}

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <UserStatusProvider>
        <CalendarProvider>
          <ConversationCalendarProvider>
            <div className="w-full h-screen overflow-hidden">
              <Router>
                <div 
                  className="w-full overflow-y-auto overflow-x-hidden" 
                  data-scroll-container
                  style={{ 
                    height: '100vh',
                    overscrollBehavior: 'none' 
                  }}
                >
                  <GlobalWebhookProcessor />
                  <RecoveryRedirector />
                  <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/success" element={<Success />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/availability" element={<Availability />} />
                  <Route path="/conversations" element={<Conversations />} />
                  <Route path="/conversations/:id" element={<ConversationDetail />} />
                  <Route path="/whatsapp-booking-assistant" element={<WhatsAppBookingAssistantPage />} />
                  <Route path="/test-ai-agent" element={<TestAIAgent />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/testing" element={<Testing />} />
                  <Route path="/team-invite" element={<TeamInvite />} />
                  <Route path="/how-it-works" element={<SeeHowItWorks />} />
                  <Route path="/why-us" element={<WhyUs />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                  <Toaster />
                </div>
              </Router>
            </div>
          </ConversationCalendarProvider>
        </CalendarProvider>
      </UserStatusProvider>
    </QueryClientProvider>
  );
}

export default App;
