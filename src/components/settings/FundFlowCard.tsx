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
    <div className={cn("border border-muted/40 rounded-lg bg-background/50", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/20 transition-colors rounded-lg"
      >
        <span className="text-xs font-medium text-foreground">{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-muted/20">
          {items.map((item, index) => (
            <div key={index} className="py-2">
              <div className="text-xs font-medium text-foreground mb-1">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}