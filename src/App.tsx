import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from '@/components/ui/toaster';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import Settings from './pages/Settings';
import Conversations from './pages/Conversations';
import TestAIAgent from './pages/TestAIAgent';
import Availability from './pages/Availability';

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/availability" element={<Availability />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/test-ai-agent" element={<TestAIAgent />} />
          </Routes>
        </div>
        <Toaster />
      </QueryClientProvider>
    </Router>
  );
}

export default App;
