
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarProvider } from '@/contexts/CalendarContext';
import { ConversationCalendarProvider } from '@/contexts/ConversationCalendarContext';
import { UserStatusProvider } from '@/contexts/UserStatusContext';
import { useEffect, lazy, Suspense } from 'react';
import { useWebhookAutoProcessor } from '@/hooks/useWebhookAutoProcessor';
import { useAuth } from '@/hooks/useAuth';
import SecurityAlertsMonitor from '@/components/security/SecurityAlertsMonitor';

// Eager-loaded auth pages (needed immediately)
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import AuthCallback from '@/pages/AuthCallback';
import Index from '@/pages/Index';
import { FullPageLoadingSkeleton } from '@/components/loading/FullPageLoadingSkeleton';
import { InlineRouteSpinner } from '@/components/loading/InlineRouteSpinner';
import { PagePrefetcher } from '@/components/loading/PagePrefetcher';
import { RouteErrorBoundary } from '@/components/error-boundaries/RouteErrorBoundary';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

// Lazy-loaded pages for code splitting
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'));
const Testing = lazy(() => import('@/pages/Testing'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Settings = lazy(() => import('@/pages/Settings'));
const Availability = lazy(() => import('@/pages/Availability'));
const Conversations = lazy(() => import('@/pages/Conversations'));
const ConversationDetail = lazy(() => import('@/pages/ConversationDetail'));
const SeeHowItWorks = lazy(() => import('@/pages/SeeHowItWorks'));
const WhyUs = lazy(() => import('@/pages/WhyUs'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const TestAIAgent = lazy(() => import('@/pages/TestAIAgent'));
const WhatsAppBookingAssistantPage = lazy(() => import('@/pages/WhatsAppBookingAssistant'));
const Profile = lazy(() => import('@/pages/Profile'));
const TeamInvite = lazy(() => import('@/pages/TeamInvite'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const Contact = lazy(() => import('@/pages/Contact'));
const About = lazy(() => import('@/pages/About'));
const Success = lazy(() => import('@/pages/Success'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Bookings = lazy(() => import('@/pages/Bookings'));
const StripeGo = lazy(() => import('@/pages/StripeGo'));
const BusinessSearch = lazy(() => import('@/pages/BusinessSearch'));
const SecurityAudit = lazy(() => import('@/pages/SecurityAudit'));
const Blog = lazy(() => import('@/pages/Blog'));
const BlogArticle = lazy(() => import('@/pages/BlogArticle'));


const queryClient = new QueryClient();

// Global webhook processor component
function GlobalWebhookProcessor() {
  const { user } = useAuth();
  
  // Start global webhook auto-processor when user is authenticated
  // OPTIMIZED: Reduced from 3s to 15s for better performance
  useWebhookAutoProcessor({ 
    enabled: !!user,
    intervalMs: 15000 // Process every 15 seconds globally
  });

  return null; // This component doesn't render anything
}

// Redirect ONLY password recovery links to /reset-password
// DO NOT redirect OAuth errors - those are handled by AuthCallback
function RecoveryRedirector() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const redirectIfRecovery = () => {
      const { pathname, search, hash } = window.location;
      const normalizedHash = hash === '#' ? '' : hash; // Treat lone '#' as empty

      // IMPORTANT: Only detect password recovery flows (type=recovery)
      // DO NOT redirect OAuth callbacks or OAuth errors
      const isOAuthCallback = pathname.includes('/auth/callback');
      if (isOAuthCallback) {
        // Let AuthCallback handle OAuth flows
        return;
      }

      // ONLY redirect if type=recovery is EXPLICITLY in the URL
      // Do NOT use sessionStorage guessing - it causes false redirects
      const hasRecoveryType = (normalizedHash && normalizedHash.includes('type=recovery')) ||
                              (search && search.includes('type=recovery'));
      
      const alreadyOnReset = pathname.includes('/reset-password');
      
      if (hasRecoveryType && !alreadyOnReset) {
        console.log('[RecoveryRedirector] Redirecting to reset-password - type=recovery found in URL');
        sessionStorage.removeItem('password-reset-requested');
        navigate(`/reset-password${search || ''}${normalizedHash || ''}`, { replace: true });
      }
    };

    redirectIfRecovery();
  }, [navigate, location]);
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
                  <PagePrefetcher />
                  <OfflineIndicator />
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    
                    {/* Protected routes with error boundaries and loading states */}
                    <Route path="/forgot-password" element={
                      <RouteErrorBoundary routeName="Forgot Password">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <ForgotPassword />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/reset-password" element={
                      <RouteErrorBoundary routeName="Reset Password">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <ResetPassword />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/verify-email" element={
                      <RouteErrorBoundary routeName="Verify Email">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <VerifyEmail />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/profile" element={
                      <RouteErrorBoundary routeName="Profile">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <Profile />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/dashboard" element={
                      <RouteErrorBoundary routeName="Dashboard">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <Dashboard />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/success" element={
                      <RouteErrorBoundary routeName="Success">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <Success />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/calendar" element={
                      <RouteErrorBoundary routeName="Calendar">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <Calendar />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/bookings" element={
                      <RouteErrorBoundary routeName="Bookings">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <Bookings />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/availability" element={
                      <RouteErrorBoundary routeName="Availability">
                        <Suspense fallback={<InlineRouteSpinner />}>
                          <Availability />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/conversations" element={
                      <RouteErrorBoundary routeName="Conversations">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <Conversations />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/conversations/:id" element={
                      <RouteErrorBoundary routeName="Conversation Detail">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <ConversationDetail />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/whatsapp-booking-assistant" element={
                      <RouteErrorBoundary routeName="WhatsApp Booking Assistant">
                        <Suspense fallback={<InlineRouteSpinner />}>
                          <WhatsAppBookingAssistantPage />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/test-ai-agent" element={
                      <RouteErrorBoundary routeName="Test AI Agent">
                        <Suspense fallback={<InlineRouteSpinner />}>
                          <TestAIAgent />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/settings" element={
                      <RouteErrorBoundary routeName="Settings">
                        <Suspense fallback={<InlineRouteSpinner />}>
                          <Settings />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/testing" element={
                      <RouteErrorBoundary routeName="Testing">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <Testing />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/team-invite" element={
                      <RouteErrorBoundary routeName="Team Invite">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <TeamInvite />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/how-it-works" element={
                      <RouteErrorBoundary routeName="How It Works">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <SeeHowItWorks />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/why-us" element={
                      <RouteErrorBoundary routeName="Why Us">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <WhyUs />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/faq" element={
                      <RouteErrorBoundary routeName="FAQ">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <FAQ />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/terms-of-service" element={
                      <RouteErrorBoundary routeName="Terms of Service">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <TermsOfService />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/privacy-policy" element={
                      <RouteErrorBoundary routeName="Privacy Policy">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <PrivacyPolicy />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/contact" element={
                      <RouteErrorBoundary routeName="Contact">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <Contact />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/about" element={
                      <RouteErrorBoundary routeName="About">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <About />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/stripe/go" element={
                      <RouteErrorBoundary routeName="Stripe">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <StripeGo />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/business-search" element={
                      <RouteErrorBoundary routeName="Business Search">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <BusinessSearch />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/admin/security" element={
                      <RouteErrorBoundary routeName="Security Audit">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <SecurityAudit />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/blog" element={
                      <RouteErrorBoundary routeName="Blog">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <Blog />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="/blog/:slug" element={
                      <RouteErrorBoundary routeName="Blog Article">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <BlogArticle />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                    <Route path="*" element={
                      <RouteErrorBoundary routeName="Not Found">
                        <Suspense fallback={<FullPageLoadingSkeleton />}>
                          <NotFound />
                        </Suspense>
                      </RouteErrorBoundary>
                    } />
                  </Routes>
                  <Toaster />
                  <SecurityAlertsMonitor />
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
