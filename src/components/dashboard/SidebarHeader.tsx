
import React from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';

interface SidebarHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function SidebarHeader({ isSidebarOpen, onToggleSidebar }: SidebarHeaderProps) {
  return (
    <div className="flex h-16 items-center justify-between px-4 border-b border-gray-700">
      {/* Logo - only show when expanded */}
      {isSidebarOpen && (
        <h1 className="text-xl font-bold text-white transition-all duration-300 notranslate">
          Bookings Assistant
        </h1>
      )}
      
      {/* Toggle Button - positioned correctly */}
      <button
        onClick={onToggleSidebar}
        className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700 transition-all duration-200 hover:scale-105 group flex-shrink-0"
        title={isSidebarOpen ? 'Sidebar inklappen' : 'Sidebar uitklappen'}
      >
        {isSidebarOpen ? (
          <PanelLeft className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
        ) : (
          <PanelRight className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
        )}
      </button>
    </div>
  );
}
