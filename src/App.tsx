import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Profile from '@/pages/Profile';
import AuthCallback from '@/pages/AuthCallback';
import GoogleCalendarCallback from '@/pages/GoogleCalendarCallback';
import OutlookCalendarCallback from '@/pages/OutlookCalendarCallback';
import SeeHowItWorks from '@/pages/SeeHowItWorks';
import WhyUs from '@/pages/WhyUs';
import FAQ from '@/pages/FAQ';
import Settings from '@/pages/Settings';
import Conversations from '@/pages/Conversations';
import NotFound from '@/pages/NotFound';
import { Toaster } from '@/components/ui/toaster';
import './App.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/profile',
    element: <Profile />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
  {
    path: '/auth/google/callback',
    element: <GoogleCalendarCallback />,
  },
  {
    path: '/auth/outlook/callback',
    element: <OutlookCalendarCallback />,
  },
  {
    path: '/see-how-it-works',
    element: <SeeHowItWorks />,
  },
  {
    path: '/why-us',
    element: <WhyUs />,
  },
  {
    path: '/faq',
    element: <FAQ />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
  {
    path: '/conversations',
    element: <Conversations />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
