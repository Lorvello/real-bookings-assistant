
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-white/[0.08]">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative p-4 bg-muted/40 border border-white/[0.08] rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-4 w-4 text-subtle-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Populairste Service</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{topBookingService.service_name}</p>
              <p className="text-sm text-muted-foreground">{topBookingService.booking_count} boekingen</p>
              <div className="absolute top-2 right-2 p-1 rounded-full bg-white/[0.04]">
                <Info className="h-3 w-3 text-subtle-foreground hover:text-foreground transition-colors" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent
            className="max-w-sm bg-popover border border-white/[0.08] text-foreground z-50"
            side="top"
            align="center"
            sideOffset={8}
          >
            <p className="text-sm">Service with the highest number of bookings. Shows customer demand preferences and popular offerings.</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Euro className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Highest Revenue</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{topRevenueService.service_name}</p>
              <p className="text-sm text-muted-foreground">€{maxRevenue.toFixed(2)}</p>
              <div className="absolute top-2 right-2 p-1 rounded-full bg-white/[0.04]">
                <Info className="h-3 w-3 text-subtle-foreground hover:text-foreground transition-colors" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent
            className="max-w-sm bg-popover border border-white/[0.08] text-foreground z-50"
            side="top"
            align="center"
            sideOffset={8}
          >
            <p className="text-sm">Service generating the most revenue. Identifies your most profitable service for business focus.</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative p-4 bg-muted/40 border border-white/[0.08] rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-4 w-4 text-subtle-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Highest Average</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{topAvgPriceService.service_name}</p>
              <p className="text-sm text-muted-foreground">€{topAvgPriceService.avg_price.toFixed(2)} gem.</p>
              <div className="absolute top-2 right-2 p-1 rounded-full bg-white/[0.04]">
                <Info className="h-3 w-3 text-subtle-foreground hover:text-foreground transition-colors" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent
            className="max-w-sm bg-popover border border-white/[0.08] text-foreground z-50"
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
