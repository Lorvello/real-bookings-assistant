
import React from 'react';

interface DashboardHeaderProps {
  calendarName: string;
}

export function DashboardHeader({ calendarName }: DashboardHeaderProps) {
  return (
    <div className="relative">
      
      <div className="relative bg-card border border-white/[0.08] p-8 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <h1 className="text-4xl font-semibold bg-gradient-to-r from-foreground via-primary to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <div className="px-4 py-1.5 bg-primary/15 text-primary text-sm font-semibold border border-white/[0.08] rounded-xl">
                Live
              </div>
            </div>
            <p className="text-muted-foreground text-lg font-medium">
              Real-time overview of your bookings and performance for{' '}
              <span className="font-semibold text-foreground bg-primary/10 px-2 py-1 rounded-xl">
                {calendarName}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right space-y-2">
              <div className="text-sm text-muted-foreground font-semibold">Active calendar</div>
              <div className="font-semibold text-foreground text-lg">{calendarName}</div>
            </div>
            <div className="relative">
              <div className="w-6 h-6 bg-gradient-to-r from-primary to-green-400 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-6 h-6 bg-primary/30 rounded-full animate-ping"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
