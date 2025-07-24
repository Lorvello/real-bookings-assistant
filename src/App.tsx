
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  useEffect(() => {
    const detectAndTranslate = () => {
      if (navigator.language.startsWith('nl')) {
        setTimeout(() => {
          const selectBox = document.querySelector('.goog-te-combo') as HTMLSelectElement;
          if (selectBox) {
            selectBox.value = 'nl';
            selectBox.dispatchEvent(new Event('change'));
          }
        }, 2000);
      }
    };
    
    // Wait for Google Translate to load
    setTimeout(detectAndTranslate, 3000);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserStatusProvider>
        <CalendarProvider>
          <ConversationCalendarProvider>
            <Router>
              <div id="google_translate_element" style={{ display: 'none' }}></div>
              <GlobalWebhookProcessor />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/dashboard" element={<Dashboard />} />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </Router>
          </ConversationCalendarProvider>
        </CalendarProvider>
      </UserStatusProvider>
    </QueryClientProvider>
  );
}

export default App;
