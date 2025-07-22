
import React from 'react';

interface DashboardHeaderProps {
  calendarName: string;
}

export function DashboardHeader({ calendarName }: DashboardHeaderProps) {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-purple-500/15 to-blue-500/20 blur-2xl rounded-3xl"></div>
      
      <div className="relative bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-2xl border border-primary/20 shadow-2xl p-8 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <h1 className="text-4xl font-black bg-gradient-to-r from-foreground via-primary to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <div className="px-4 py-1.5 bg-gradient-to-r from-primary/20 via-primary/15 to-purple-500/20 text-primary text-sm font-bold border border-primary/30 shadow-lg rounded-2xl">
                Live
              </div>
            </div>
            <p className="text-muted-foreground text-lg font-medium">
              Realtime overzicht van je boekingen en performance voor{' '}
              <span className="font-bold text-foreground bg-gradient-to-r from-primary/20 to-transparent px-2 py-1 rounded-xl">
                {calendarName}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right space-y-2">
              <div className="text-sm text-muted-foreground font-semibold">Actieve kalender</div>
              <div className="font-bold text-foreground text-lg">{calendarName}</div>
            </div>
            <div className="relative">
              <div className="w-6 h-6 bg-gradient-to-r from-primary to-green-400 rounded-full animate-pulse shadow-lg"></div>
              <div className="absolute inset-0 w-6 h-6 bg-primary/30 rounded-full animate-ping"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
