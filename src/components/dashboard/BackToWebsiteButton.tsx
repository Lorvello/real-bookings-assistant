
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BackToWebsiteButtonProps {
  isSidebarOpen: boolean;
  onBackToWebsite: () => void;
  tooltipsDisabled?: boolean;
}

export function BackToWebsiteButton({ isSidebarOpen, onBackToWebsite, tooltipsDisabled = false }: BackToWebsiteButtonProps) {
  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="px-2 py-2 border-b border-gray-700">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onBackToWebsite}
              className={`
                group flex items-center rounded-lg transition-all duration-200 text-gray-300 hover:bg-gray-700 hover:text-white hover:scale-105
                ${isSidebarOpen 
                  ? 'px-2 py-2 text-sm font-medium w-full text-left' 
                  : 'w-12 h-12 justify-center mx-auto'
                }
              `}
            >
              <ArrowLeft
                className={`${isSidebarOpen ? 'mr-3' : ''} h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-white transition-colors duration-200`}
              />
              {isSidebarOpen && (
                <span className="transition-all duration-300 opacity-100 translate-x-0">
                  Back to Website
                </span>
              )}
            </button>
          </TooltipTrigger>
          {!isSidebarOpen && !tooltipsDisabled && (
            <TooltipContent side="right" sideOffset={16} className="bg-popover border text-popover-foreground">
              <p className="text-sm">Back to Website</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
