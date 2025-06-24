import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarProvider } from '@/contexts/CalendarContext';
import { ConversationCalendarProvider } from '@/contexts/ConversationCalendarContext';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import AuthCallback from '@/pages/AuthCallback';
import Testing from '@/pages/Testing';
import NotFound from '@/pages/NotFound';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';
import Availability from '@/pages/Availability';
import Conversations from '@/pages/Conversations';
import ConversationDetail from '@/pages/ConversationDetail';
import SeeHowItWorks from '@/pages/SeeHowItWorks';
import WhyUs from '@/pages/WhyUs';
import FAQ from '@/pages/FAQ';
import TestAIAgent from '@/pages/TestAIAgent';

// Pages
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Calendar from '@/pages/Calendar';
import Bookings from '@/pages/Bookings';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CalendarProvider>
        <ConversationCalendarProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/availability" element={<Availability />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/conversations/:id" element={<ConversationDetail />} />
              <Route path="/test-ai-agent" element={<TestAIAgent />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/testing" element={<Testing />} />
              <Route path="/see-how-it-works" element={<SeeHowItWorks />} />
              <Route path="/why-us" element={<WhyUs />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </Router>
        </ConversationCalendarProvider>
      </CalendarProvider>
    </QueryClientProvider>
  );
}

export default App;
