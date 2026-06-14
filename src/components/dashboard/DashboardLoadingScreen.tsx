
import React from 'react';

export function DashboardLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Organic Loading Background */}
      <div className="absolute inset-0">
      </div>
      
      <div className="relative z-10 text-center space-y-8">
        {/* Liquid Loading Animation */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute w-full h-full bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-full animate-spin opacity-75" 
               style={{
                 clipPath: 'polygon(50% 0%, 80% 30%, 100% 50%, 80% 70%, 50% 100%, 20% 70%, 0% 50%, 20% 30%)'
               }}></div>
          <div className="absolute inset-2 bg-gradient-to-br from-card to-background rounded-full"></div>
          <div className="absolute inset-4 bg-primary/20 rounded-full animate-pulse"></div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-[-0.015em] text-foreground">
            Loading dashboard
          </h2>
          <p className="text-muted-foreground">One moment, we're getting everything ready...</p>
        </div>
      </div>
    </div>
  );
}
