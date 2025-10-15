
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
      className={`fixed top-1/2 -translate-y-1/2 z-20 bg-primary hover:bg-primary/90 text-white p-2 rounded-l-lg shadow-lg transition-all duration-300 ${
        isExpanded ? 'right-80' : 'right-0'
      }`}
      title={isExpanded ? 'Collapse Availability' : 'Expand Availability'}
    >
      {isExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </button>
  );
}
