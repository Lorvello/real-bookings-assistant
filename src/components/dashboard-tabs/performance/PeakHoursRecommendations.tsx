
import React from 'react';

interface PeakHoursData {
  hour: number;
  count: number;
}

interface PeakHoursRecommendationsProps {
  peakHours: PeakHoursData[];
  quietHours: PeakHoursData[];
}

export function PeakHoursRecommendations({ peakHours, quietHours }: PeakHoursRecommendationsProps) {
  return (
    <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/50 rounded-xl p-4 border border-slate-600/40">
      <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
        💡 Aanbevelingen
      </h4>
      <div className="space-y-2 text-sm text-slate-300">
        {peakHours[0] && (
          <p>• Overweeg extra personeel in te zetten tijdens piekuur ({peakHours[0].hour}:00-{peakHours[0].hour + 1}:00)</p>
        )}
        {quietHours[0] && (
          <p>• Gebruik rustige uren ({quietHours[0].hour}:00-{quietHours[0].hour + 1}:00) voor administratie of marketing</p>
        )}
        <p>• Implementeer dynamische prijsstelling voor piekuren om vraag te spreiden</p>
      </div>
    </div>
  );
}
