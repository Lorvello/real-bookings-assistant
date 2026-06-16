
import React, { useState } from 'react';
import { useDeveloperAccess } from '@/hooks/useDeveloperAccess';
import { DeveloperStatusManager } from './DeveloperStatusManager';
import { StripeModeIndicator } from './StripeModeIndicator';
import { Code, X } from 'lucide-react';

export const DeveloperDashboard = () => {
  const { isDeveloper } = useDeveloperAccess();
  const [open, setOpen] = useState(false);

  // Only render for developers in development environment
  if (!isDeveloper) {
    return null;
  }

  // Collapsed by default: a small unobtrusive chip so the real product is never
  // covered by dev tooling. Expands into a dark glass panel on demand.
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Open developer tools"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-popover/90 backdrop-blur-md border border-white/[0.1] px-3 py-2 text-xs font-medium text-muted-foreground shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] hover:text-foreground hover:border-white/[0.16] transition-colors"
      >
        <Code className="h-3.5 w-3.5 text-accent-foreground" />
        Dev
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto dashboard-scrollbar glass rounded-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-popover/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Code className="h-4 w-4 text-accent-foreground" />
          Developer Tools
        </div>
        <button
          onClick={() => setOpen(false)}
          title="Close developer tools"
          className="text-subtle-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <DeveloperStatusManager />
        <StripeModeIndicator />
      </div>
    </div>
  );
};
