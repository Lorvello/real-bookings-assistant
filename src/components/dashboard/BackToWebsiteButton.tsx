
import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackToWebsiteButtonProps {
  isSidebarOpen: boolean;
  onBackToWebsite: () => void;
}

export function BackToWebsiteButton({ isSidebarOpen, onBackToWebsite }: BackToWebsiteButtonProps) {
  return (
    <div className="px-2 py-2 border-b border-gray-700">
      <button
        onClick={onBackToWebsite}
        className="group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200 w-full text-left text-gray-300 hover:bg-gray-700 hover:text-white hover:scale-105"
        title="Terug naar website"
      >
        <ArrowLeft
          className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-white transition-colors duration-200"
        />
        <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
          Back to Website
        </span>
      </button>
    </div>
  );
}
