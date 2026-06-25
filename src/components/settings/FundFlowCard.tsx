import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FundFlowCardProps {
  title: string;
  items: Array<{
    label: string;
    description: string;
  }>;
  className?: string;
}

export function FundFlowCard({ title, items, className }: FundFlowCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn("relative rounded-lg border border-white/[0.06] bg-white/[0.02]", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full min-h-11 p-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-0"
      >
        <span className="text-xs font-medium text-foreground">{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      
      {/* Simple dropdown without overlay */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-white/[0.08] bg-popover shadow-lg">
          <div className="p-2 space-y-1">
            {items.map((item, index) => (
              <div key={index} className="py-1">
                <div className="text-xs font-medium text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}