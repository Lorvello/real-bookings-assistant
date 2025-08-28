import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
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
  const cardRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isExpanded]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node) && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  return (
    <>
      {/* Overlay background */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 animate-fade-in"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      <div 
        ref={cardRef}
        className={cn("relative border border-muted/40 rounded-lg bg-background/50", className)}
      >
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
        
        {/* Expanded content as floating overlay */}
        {isExpanded && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-muted/40 rounded-lg shadow-lg z-50 animate-fade-in">
            <div className="flex items-center justify-between p-3 border-b border-muted/20">
              <span className="text-sm font-medium text-foreground">{title}</span>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-muted/20 rounded-md transition-colors"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
            <div className="p-3 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}