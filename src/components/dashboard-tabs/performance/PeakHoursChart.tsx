
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Activity, Clock, Users, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PeakHoursData {
  hour: number;
  bookings: number;
  hour_label: string;
}

interface PeakHoursChartProps {
  data?: PeakHoursData[];
  isLoading?: boolean;
  periodLabel?: string;
}

export function PeakHoursChart({ data, isLoading, periodLabel }: PeakHoursChartProps) {
  if (isLoading) {
    return (
      <div className="h-80 surface-raised shimmer rounded-xl"></div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-muted/40 rounded-2xl flex items-center justify-center border border-white/[0.08]">
          <Activity className="h-10 w-10 text-muted-foreground" />
        </div>
        <p className="text-foreground font-medium mb-2">No peak hours data available</p>
        <p className="text-sm text-muted-foreground">More historical data needed for analysis</p>
      </div>
    );
  }

  // Create a complete dataset for all working hours (6:00 - 22:00)
  const completeHourData = [];
  for (let hour = 6; hour <= 22; hour++) {
    const existingData = data.find(d => d.hour === hour);
    completeHourData.push({
      hour,
      bookings: existingData?.bookings || 0,
      hour_label: `${hour.toString().padStart(2, '0')}:00`,
      display_label: `${hour}:00`
    });
  }

  // Determine max value for color intensity
  const maxBookings = Math.max(...completeHourData.map(d => d.bookings));
  
  // Simplified function to determine color based on activity (3 categories only)
  const getBarColor = (bookings: number) => {
    if (bookings === 0) return 'hsl(var(--subtle-foreground) / 0.30)'; // Gray for no bookings
    
    const intensity = bookings / maxBookings;
    if (intensity >= 0.7) return 'hsl(var(--primary))'; // Orange for busy
    if (intensity >= 0.4) return 'hsl(var(--primary) / 0.62)'; // Yellow for moderate
    return 'hsl(var(--primary) / 0.34)'; // Green for quiet
  };

  // Custom tooltip component with simplified categories
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const bookings = data.bookings;
      
      let activityLevel = '';
      if (bookings === 0) activityLevel = 'No bookings';
      else if (bookings / maxBookings >= 0.7) activityLevel = 'Busy';
      else if (bookings / maxBookings >= 0.4) activityLevel = 'Moderate';
      else activityLevel = 'Quiet';

      return (
        <div className="bg-popover border border-white/[0.12] rounded-xl p-4 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-accent-foreground" />
            <span className="text-foreground font-semibold">{label}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-accent-foreground" />
            <span className="text-foreground">{bookings} appointments</span>
          </div>
          <div className="text-sm text-foreground mt-2 px-2 py-1 bg-card/50 rounded">
            {activityLevel}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Clean centered legend */}
        <div className="flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--primary)/0.34)]"></div>
            <span className="text-sm font-medium text-foreground">Quiet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--primary)/0.62)]"></div>
            <span className="text-sm font-medium text-foreground">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-sm font-medium text-foreground">Busy</span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={completeHourData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.08)" opacity={0.3} />
              <XAxis 
                dataKey="display_label" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Number of appointments', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="bookings" radius={[4, 4, 0, 0]}>
                {completeHourData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.bookings)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick insights at the bottom */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {(() => {
            const sortedHours = [...completeHourData].sort((a, b) => b.bookings - a.bookings);
            const busiestHour = sortedHours[0];
            const quietestHours = completeHourData.filter(h => h.bookings === 0);
            const averageBookings = completeHourData.reduce((sum, h) => sum + h.bookings, 0) / completeHourData.length;

            return (
              <>
                <div className="bg-gold/10 border border-gold/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-gold rounded-full"></div>
                    <span className="text-sm font-medium text-foreground flex items-center gap-1">
                      Busiest time
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help p-1 rounded-full bg-white/[0.04]">
                            <Info className="h-3 w-3 text-subtle-foreground hover:text-foreground transition-colors" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          className="max-w-sm bg-popover border border-white/[0.08] text-foreground z-50"
                          side="top"
                          align="center"
                          sideOffset={8}
                        >
                          <p className="text-sm">The hour of the day with the highest number of appointments. Shows your peak demand period for optimal staffing.</p>
                        </TooltipContent>
                      </UITooltip>
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{busiestHour.display_label}</p>
                  <p className="text-sm text-foreground">{busiestHour.bookings} appointments</p>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium text-foreground flex items-center gap-1">
                      Quiet times
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help p-1 rounded-full bg-white/[0.04]">
                            <Info className="h-3 w-3 text-subtle-foreground hover:text-foreground transition-colors" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          className="max-w-sm bg-popover border border-white/[0.08] text-foreground z-50"
                          side="top"
                          align="center"
                          sideOffset={8}
                        >
                          <p className="text-sm">Number of hours per day with no scheduled appointments. Indicates available capacity and potential growth opportunities.</p>
                        </TooltipContent>
                      </UITooltip>
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{quietestHours.length} hours</p>
                  <p className="text-sm text-foreground">Without appointments</p>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium text-foreground flex items-center gap-1">
                      Average per hour
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help p-1 rounded-full bg-white/[0.04]">
                            <Info className="h-3 w-3 text-subtle-foreground hover:text-foreground transition-colors" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          className="max-w-sm bg-popover border border-white/[0.08] text-foreground z-50"
                          side="top"
                          align="center"
                          sideOffset={8}
                        >
                          <p className="text-sm">Average number of appointments per operating hour. Measures overall calendar efficiency and utilization.</p>
                        </TooltipContent>
                      </UITooltip>
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{averageBookings.toFixed(1)}</p>
                  <p className="text-sm text-foreground">appointments</p>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </TooltipProvider>
  );
}
