
import React from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';

interface SidebarHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isMobile?: boolean;
}

export function SidebarHeader({ isSidebarOpen, onToggleSidebar, isMobile = false }: SidebarHeaderProps) {
  return (
    <div className="flex h-16 items-center justify-between px-4 border-b border-gray-700">
      {/* Logo - only show when expanded */}
      {isSidebarOpen && (
        <h1 className={`font-bold text-white transition-all duration-300 notranslate ${
          isMobile ? 'text-lg' : 'text-xl'
        }`}>
          Bookings Assistant
        </h1>
      )}
      
      {/* Toggle Button - positioned correctly */}
      <button
        onClick={onToggleSidebar}
        className={`text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700 transition-all duration-200 hover:scale-105 group flex-shrink-0 ${
          isMobile ? 'p-3' : 'p-2'
        }`}
        title={isSidebarOpen ? 'Sidebar inklappen' : 'Sidebar uitklappen'}
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
