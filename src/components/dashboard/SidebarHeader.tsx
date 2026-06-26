
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PanelLeft, PanelRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import LanguageToggle from '@/components/LanguageToggle';

interface SidebarHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
  tooltipsDisabled?: boolean;
}

export function SidebarHeader({ isSidebarOpen, onToggleSidebar, isMobile = false, tooltipsDisabled = false }: SidebarHeaderProps) {
  const { t } = useTranslation('app');
  return (
    <div className="flex h-16 items-center justify-between pr-4 pl-2 border-b border-white/[0.08]">
      {/* Logo - only show when expanded */}
      {isSidebarOpen && (
        <div className="transition-all duration-300 select-none">
          <img 
            src="/lovable-uploads/81803cac-40e1-4777-b914-5ca4e2490468.png" 
            alt={t('app.logoAlt', 'Bookings Assistant logo')}
            className={`w-auto pointer-events-none select-none ${isMobile ? 'h-10' : 'h-12'}`}
            width="107"
            height="48"
            loading="eager"
            decoding="async"
          />
        </div>
      )}
      
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Language switch (EN/NL) - only when the sidebar is expanded; carries the
            same localStorage choice from the public site into the logged-in app. */}
        {isSidebarOpen && <LanguageToggle />}

      {/* Toggle Button - positioned correctly */}
      <button
        onClick={onToggleSidebar}
        className={`text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-white/[0.06] transition-all duration-200 hover:scale-105 group flex-shrink-0 ${
          isMobile ? 'p-3' : 'p-2'
        }`}
      >
        {isSidebarOpen ? (
          <PanelLeft className={`transition-transform duration-200 group-hover:scale-110 ${
            isMobile ? 'w-5 h-5' : 'w-4 h-4'
          }`} />
        ) : (
          <PanelRight className={`transition-transform duration-200 group-hover:scale-110 ${
            isMobile ? 'w-5 h-5' : 'w-4 h-4'
          }`} />
        )}
      </button>
      </div>
    </div>
  );
}
