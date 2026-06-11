import { ReactNode } from 'react';
import { CalendarCheck } from 'lucide-react';

/**
 * Shared premium backdrop for the auth pages (login / signup), matching the
 * public booking page: deep dark base, a soft primary radial glow, and a
 * brand mark above the form card. Keeps both auth pages visually consistent.
 */
export const AuthShell = ({ children }: { children: ReactNode }) => (
  <div className="relative min-h-screen overflow-hidden bg-[#0a0f1a] text-white">
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[460px] opacity-70"
      style={{
        background:
          'radial-gradient(60% 80% at 50% 0%, hsl(142 69% 45% / 0.18), transparent 70%)',
      }}
    />
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-7 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/30">
          <CalendarCheck className="h-5 w-5 text-primary" />
        </div>
        <span className="font-garamond text-2xl font-medium tracking-tight text-white">
          Bookings Assistant
        </span>
      </div>
      {children}
    </div>
  </div>
);
