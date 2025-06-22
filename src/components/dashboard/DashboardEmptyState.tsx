
import React from 'react';

export function DashboardEmptyState() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Organic Background Shapes */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-xl"></div>
      </div>
      
      <div className="relative z-10 text-center space-y-8 max-w-md mx-auto px-6">
        {/* Organic Icon Container */}
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/15 to-blue-500/10 rounded-full blur-xl"></div>
          <div className="relative w-full h-full bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl border border-primary/20 shadow-xl"
               style={{
                 borderRadius: '30% 70% 60% 40% / 40% 50% 60% 30%'
               }}>
            <div className="absolute inset-8 bg-primary/10 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg"></div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-400 bg-clip-text text-transparent">
            Geen kalender beschikbaar
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Maak eerst een kalender aan om het dashboard te kunnen gebruiken en je afspraken te beheren
          </p>
        </div>
      </div>
    </div>
  );
}
