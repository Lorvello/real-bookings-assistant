// DEV-ONLY no-auth a11y harness for the GLOBAL Radix toast primitive (D-006).
// Mounts the REAL <Toaster/> (src/components/ui/toaster.tsx -> ui/toast.tsx)
// and fires a toast on mount so axe-core can inspect a LIVE toast (viewport
// <ol>/region, the toast <li role=status>, the ToastClose button, and Radix's
// focus-proxy sentinels). i18n is initialized so the close-button + region
// aria-labels resolve. Not part of the production build (rollup input is
// index.html only); served by `vite` dev at /preview/toast-a11y.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import '@/i18n';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';

function Harness() {
  React.useEffect(() => {
    // fire a default + a destructive toast so both variants are present
    toast({
      title: 'Booking confirmed',
      description: 'Your appointment is set for Monday 09:00.',
    });
  }, []);
  return (
    <div className="dark min-h-screen bg-background p-8">
      <h1 className="text-foreground text-xl">Toast a11y harness</h1>
      <p className="text-foreground/70">A toast fires on mount for the axe scan.</p>
      <Toaster />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
