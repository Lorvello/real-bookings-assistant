
import React from 'react';
import { Activity, Euro, TrendingUp, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ServicePerformanceData {
  service_name: string;
  booking_count: number;
  revenue: number;
  avg_price: number;
}

interface ServiceInsightCardsProps {
  data: ServicePerformanceData[];
}

export function ServiceInsightCards({ data }: ServiceInsightCardsProps) {
  if (data.length === 0) return null;

  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const topBookingService = data.reduce((prev, current) => 
    prev.booking_count > current.booking_count ? prev : current
  );
  const topRevenueService = data.reduce((prev, current) => 
    prev.revenue > current.revenue ? prev : current
  );
  const topAvgPriceService = data.reduce((prev, current) => 
    prev.avg_price > current.avg_price ? prev : current
  );

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-700/30">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Populairste Service</span>
              </div>
              <p className="text-lg font-bold text-slate-100">{topBookingService.service_name}</p>
              <p className="text-sm text-slate-400">{topBookingService.booking_count} boekingen</p>
              <div className="absolute top-2 right-2 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                <Info className="h-3 w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent 
            className="max-w-sm bg-slate-900/95 border border-blue-500/30 text-slate-100 z-50"
            side="top"
            align="center"
            sideOffset={8}
          >
            <p className="text-sm">Service with the highest number of bookings. Shows customer demand preferences and popular offerings.</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Euro className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">Hoogste Omzet</span>
              </div>
              <p className="text-lg font-bold text-slate-100">{topRevenueService.service_name}</p>
              <p className="text-sm text-slate-400">€{maxRevenue.toFixed(2)}</p>
              <div className="absolute top-2 right-2 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                <Info className="h-3 w-3 text-emerald-400/70 hover:text-emerald-300 transition-colors" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent 
            className="max-w-sm bg-slate-900/95 border border-emerald-500/30 text-slate-100 z-50"
            side="top"
            align="center"
            sideOffset={8}
          >
            <p className="text-sm">Service generating the most revenue. Identifies your most profitable service for business focus.</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative p-4 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5 border border-purple-500/20 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Hoogste Gemiddelde</span>
              </div>
              <p className="text-lg font-bold text-slate-100">{topAvgPriceService.service_name}</p>
              <p className="text-sm text-slate-400">€{topAvgPriceService.avg_price.toFixed(2)} gem.</p>
              <div className="absolute top-2 right-2 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                <Info className="h-3 w-3 text-purple-400/70 hover:text-purple-300 transition-colors" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent 
            className="max-w-sm bg-slate-900/95 border border-purple-500/30 text-slate-100 z-50"
            side="top"
            align="center"
            sideOffset={8}
          >
            <p className="text-sm">Service with the highest average revenue per booking. Shows premium service performance.</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
