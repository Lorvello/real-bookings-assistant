
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { CalendarProvider } from '@/contexts/CalendarContext';
import { ConversationCalendarProvider } from '@/contexts/ConversationCalendarContext';
import Index from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Conversations from './pages/Conversations';
import TestAIAgent from './pages/TestAIAgent';
import Availability from './pages/Availability';
import Profile from './pages/Profile';

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <CalendarProvider>
          <ConversationCalendarProvider>
            <div className="min-h-screen">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Signup />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/availability" element={<Availability />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/conversations" element={<Conversations />} />
                <Route path="/test-ai-agent" element={<TestAIAgent />} />
              </Routes>
            </div>
            <Toaster />
          </ConversationCalendarProvider>
        </CalendarProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
