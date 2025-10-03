import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Prefetch critical "tab-like" routes after app mount
export function PagePrefetcher() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Prefetch after a short delay to not block initial render
    const timer = setTimeout(() => {
      // Prefetch the most commonly accessed internal routes
      import('@/pages/Settings');
      import('@/pages/Availability');
      import('@/pages/TestAIAgent');
      import('@/pages/WhatsAppBookingAssistant');
      import('@/pages/Calendar');
      import('@/pages/Bookings');
      import('@/pages/Conversations');
      import('@/pages/Dashboard');
    }, 500);

    return () => clearTimeout(timer);
  }, [user]);

  return null; // This component doesn't render anything
}
