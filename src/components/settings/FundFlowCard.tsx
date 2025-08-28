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
    <div className={cn("relative border border-muted/40 rounded-lg bg-background/50", className)}>
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
      
      {/* Simple dropdown without overlay */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-muted/40 rounded-lg shadow-sm z-10">
          <div className="p-2 space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </div>
                <div className="ml-3.5 text-xs text-muted-foreground">
                  {item.description.includes('•') ? (
                    <div className="space-y-0.5">
                      {item.description.split('•').filter(Boolean).map((line, lineIndex) => (
                        <div key={lineIndex}>• {line.trim()}</div>
                      ))}
                    </div>
                  ) : (
                    item.description
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}