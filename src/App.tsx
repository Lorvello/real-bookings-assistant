
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
    const initGoogleTranslate = async () => {
      console.log('🌍 Starting Google Translate detection...');
      
      // Check if already translated
      const savedLang = localStorage.getItem('preferred-language');
      if (savedLang === 'nl' && document.body.classList.contains('translated-ltr')) {
        console.log('✅ Already translated to Dutch');
        return;
      }

      let shouldTranslate = false;

      try {
        // Try IP-based detection first
        console.log('🔍 Checking IP location...');
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        console.log('📍 Location data:', data);
        
        if (data.country_code === 'NL' || data.country_code === 'BE') {
          console.log('🇳🇱 Dutch/Belgian IP detected');
          shouldTranslate = true;
          localStorage.setItem('preferred-language', 'nl');
        }
      } catch (error) {
        console.log('❌ IP detection failed, checking browser language');
        
        // Fallback to browser language detection
        const languages = navigator.languages || [navigator.language];
        const hasDutch = languages.some(lang => lang.toLowerCase().startsWith('nl'));
        
        if (hasDutch) {
          console.log('🇳🇱 Dutch browser language detected');
          shouldTranslate = true;
          localStorage.setItem('preferred-language', 'nl');
        }
      }

      if (shouldTranslate) {
        console.log('🔄 Will translate to Dutch...');
        waitForGoogleTranslateAndTranslate();
      } else {
        console.log('🇬🇧 Staying in English');
        localStorage.setItem('preferred-language', 'en');
      }
    };

    const waitForGoogleTranslateAndTranslate = () => {
      let attempts = 0;
      const maxAttempts = 20;
      
      const tryTranslate = () => {
        attempts++;
        console.log(`🔄 Translation attempt ${attempts}/${maxAttempts}`);
        
        const selectBox = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        
        if (selectBox) {
          console.log('✅ Google Translate ready, translating...');
          selectBox.value = 'nl';
          selectBox.dispatchEvent(new Event('change'));
          
          // Verify translation started
          setTimeout(() => {
            if (document.body.classList.contains('translated-ltr')) {
              console.log('🎉 Translation successful!');
            } else {
              console.log('⚠️ Translation may not have worked');
            }
          }, 2000);
          
          return;
        }
        
        if (attempts < maxAttempts) {
          console.log('⏳ Google Translate not ready yet, retrying...');
          setTimeout(tryTranslate, 500);
        } else {
          console.log('❌ Google Translate failed to load after max attempts');
        }
      };

      // Start trying after a short delay
      setTimeout(tryTranslate, 1000);
    };

    // Start the initialization
    initGoogleTranslate();
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
