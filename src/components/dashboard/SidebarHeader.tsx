
import React from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
  tooltipsDisabled?: boolean;
}

export function SidebarHeader({ isSidebarOpen, onToggleSidebar, isMobile = false, tooltipsDisabled = false }: SidebarHeaderProps) {
  return (
    <div className="flex h-16 items-center justify-between pr-4 pl-2 border-b border-gray-700">
      {/* Logo - only show when expanded */}
      {isSidebarOpen && (
        <div className="transition-all duration-300 select-none">
          <img 
            src="/lovable-uploads/81803cac-40e1-4777-b914-5ca4e2490468.png" 
            alt="Bookings Assistant logo" 
            className={`w-auto pointer-events-none select-none ${isMobile ? 'h-10' : 'h-12'}`}
          />
        </div>
      )}
      
      {/* Toggle Button - positioned correctly */}
      <button
        onClick={onToggleSidebar}
        className={`text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700 transition-all duration-200 hover:scale-105 group flex-shrink-0 ${
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
  );
}
