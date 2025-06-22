
import React from 'react';
import { DashboardTabs } from '@/components/DashboardTabs';
import { DashboardHeader } from './DashboardHeader';

interface DashboardContentProps {
  calendarId: string;
  calendarName: string;
}

export function DashboardContent({ calendarId, calendarName }: DashboardContentProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Liquid Background Layer */}
      <div className="absolute inset-0">
        {/* Primary Organic Shape */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent blur-3xl"
             style={{
               borderRadius: '40% 60% 70% 30% / 30% 40% 60% 70%',
               animation: 'float 20s ease-in-out infinite'
             }}></div>
        
        {/* Secondary Organic Shape */}
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-gradient-to-tl from-purple-500/12 via-blue-500/8 to-transparent blur-2xl"
             style={{
               borderRadius: '60% 40% 30% 70% / 70% 30% 40% 60%',
               animation: 'float 25s ease-in-out infinite reverse'
             }}></div>
        
        {/* Tertiary Organic Shape */}
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-tr from-green-500/10 via-primary/6 to-transparent blur-xl"
             style={{
               borderRadius: '50% 70% 40% 60% / 60% 50% 70% 40%',
               animation: 'float 30s ease-in-out infinite'
             }}></div>
        
        {/* Flowing Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full"
               style={{
                 backgroundImage: `radial-gradient(circle at 25% 25%, rgba(16,185,129,0.3) 1px, transparent 1px),
                                 radial-gradient(circle at 75% 75%, rgba(16,185,129,0.2) 1px, transparent 1px)`,
                 backgroundSize: '60px 60px, 40px 40px'
               }}></div>
        </div>
      </div>

      <div className="relative z-10 p-8 space-y-12">
        {/* Organic Header */}
        <DashboardHeader calendarName={calendarName} />

        {/* Organic Dashboard Tabs */}
        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-to-br from-primary/15 via-transparent to-purple-500/15 blur-3xl"
               style={{
                 borderRadius: '50% 80% 30% 70% / 40% 60% 80% 20%'
               }}></div>
          <div className="relative">
            <DashboardTabs calendarId={calendarId} />
          </div>
        </div>
      </div>
    </div>
  );
}
