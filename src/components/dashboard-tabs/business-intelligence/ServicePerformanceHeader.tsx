
import React from 'react';
import { TrendingUp, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ServicePerformanceHeaderProps {
  hasData: boolean;
  data?: any[];
  selectedTimeRange: string;
}

export function ServicePerformanceHeader({ hasData, data, selectedTimeRange }: ServicePerformanceHeaderProps) {
  return (
    <div className="p-8 border-b border-white/[0.08]">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-muted/40 rounded-xl border border-white/[0.08]">
            <TrendingUp className="h-6 w-6 text-subtle-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-semibold text-foreground">Service Performance</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help p-1 rounded-full bg-white/[0.04] hover:bg-white/[0.06] transition-colors">
                    <Info className="h-4 w-4 text-subtle-foreground hover:text-foreground transition-colors" />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  className="max-w-sm bg-popover border border-white/[0.08] text-foreground z-[9999]"
                  side="top"
                  align="center"
                  sideOffset={8}
                >
                  <p className="text-sm">Compares booking volume (blue) and revenue (green) for each service. Helps identify most profitable services and optimize your service portfolio.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-muted-foreground mt-1">{selectedTimeRange} revenue and bookings per service</p>
          </div>
        </div>
        
        {hasData && data && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-muted/40 border border-white/[0.08] rounded-xl p-4 min-h-[80px] flex flex-col justify-center">
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Total Services</p>
              <p className="text-2xl font-semibold text-foreground leading-tight">{data.length}</p>
            </div>

            <div className="bg-muted/40 border border-white/[0.08] rounded-xl p-4 min-h-[80px] flex flex-col justify-center">
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-semibold text-foreground leading-tight">
                €{data.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
