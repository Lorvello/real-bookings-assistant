
import React from 'react';

export function DashboardEmptyState() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Organic Background Shapes */}
      <div className="absolute inset-0">
      </div>
      
      <div className="relative z-10 text-center space-y-8 max-w-md mx-auto px-6">
        {/* Organic Icon Container */}
        <div className="relative w-32 h-32 mx-auto">
          <div className="relative w-full h-full bg-card border border-white/[0.08]"
               style={{
                 borderRadius: '30% 70% 60% 40% / 40% 50% 60% 30%'
               }}>
            <div className="absolute inset-8 bg-primary/10 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-primary rounded-lg"></div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold bg-gradient-to-r from-foreground via-primary to-purple-400 bg-clip-text text-transparent">
            Geen kalender beschikbaar
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Maak eerst een kalender aan om het dashboard te kunnen gebruiken en je appointments te beheren
          </p>
        </div>
      </div>
    </div>
  );
}
