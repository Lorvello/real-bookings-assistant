
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AvailabilityPanelToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function AvailabilityPanelToggle({ isExpanded, onToggle }: AvailabilityPanelToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`fixed top-1/2 -translate-y-1/2 z-20 bg-primary hover:bg-primary/90 text-primary-foreground p-3 shadow-lg shadow-primary/20 transition-all duration-300 ease-in-out ${
        isExpanded ? 'right-80 rounded-l-2xl' : 'right-0 rounded-l-2xl'
      }`}
      title={isExpanded ? 'Beschikbaarheid inklappen' : 'Beschikbaarheid uitklappen'}
    >
      {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </button>
  );
}
