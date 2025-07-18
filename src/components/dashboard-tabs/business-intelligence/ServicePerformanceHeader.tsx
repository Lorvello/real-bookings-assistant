
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
    <div className="p-8 border-b border-slate-700/30">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl backdrop-blur-sm border border-orange-500/20">
            <TrendingUp className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-slate-100">Service Performance</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help p-1 rounded-full bg-slate-800/50 backdrop-blur-sm hover:bg-slate-700/50 transition-colors">
                    <Info className="h-4 w-4 text-orange-400/70 hover:text-orange-300 transition-colors" />
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  className="max-w-sm bg-slate-900/95 border border-orange-500/30 text-slate-100 z-[9999]"
                  side="top"
                  align="center"
                  sideOffset={8}
                >
                  <p className="text-sm">Compares booking volume (blue) and revenue (green) for each service. Helps identify most profitable services and optimize your service portfolio.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-slate-400 mt-1">{selectedTimeRange} revenue and bookings per service</p>
          </div>
        </div>
        
        {hasData && data && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-slate-700/40 to-slate-800/60 backdrop-blur-sm border border-slate-600/30 rounded-xl p-4 min-h-[80px] flex flex-col justify-center">
              <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Total Services</p>
              <p className="text-2xl font-bold text-slate-100 leading-tight">{data.length}</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/20 backdrop-blur-sm border border-orange-500/30 rounded-xl p-4 min-h-[80px] flex flex-col justify-center">
              <p className="text-xs font-medium text-orange-300 mb-1 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-orange-400 leading-tight">
                €{data.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
