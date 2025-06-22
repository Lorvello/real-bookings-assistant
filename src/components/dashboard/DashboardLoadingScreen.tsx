
import React from 'react';

export function DashboardLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Organic Loading Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-purple-500/20 to-transparent rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-bl from-blue-500/25 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
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
          <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-400 bg-clip-text text-transparent">
            Dashboard wordt geladen
          </h2>
          <p className="text-muted-foreground">Een moment geduld, we bereiden alles voor...</p>
        </div>
      </div>
    </div>
  );
}
