
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BackToWebsiteButtonProps {
  isSidebarOpen: boolean;
  onBackToWebsite: () => void;
  tooltipsDisabled?: boolean;
}

export function BackToWebsiteButton({ isSidebarOpen, onBackToWebsite, tooltipsDisabled = false }: BackToWebsiteButtonProps) {
  const { t } = useTranslation('app');
  return (
    <div className="px-2 py-2 border-b border-white/[0.08]">
        <button
          onClick={onBackToWebsite}
          className={`
            group flex items-center rounded-lg transition-all duration-200 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
            ${isSidebarOpen
              ? 'px-2 py-2 min-h-11 md:min-h-0 text-sm font-medium w-full text-left'
              : 'w-12 h-12 justify-center mx-auto'
            }
          `}
        >
          <ArrowLeft
            className={`${isSidebarOpen ? 'mr-3' : ''} h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors duration-200`}
          />
          {isSidebarOpen && (
            <span className="transition-all duration-300 opacity-100 translate-x-0">
              {t('app.backToWebsite', 'Back to Website')}
            </span>
          )}
        </button>
    </div>
  );
}
