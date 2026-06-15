
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
    <div className="bg-muted/40 rounded-xl p-4 border border-white/[0.08]">
      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        Recommendations
      </h4>
      <div className="space-y-2 text-sm text-foreground">
        {peakHours[0] && (
          <p>• Consider scheduling extra staff during your peak hour ({peakHours[0].hour}:00-{peakHours[0].hour + 1}:00)</p>
        )}
        {quietHours[0] && (
          <p>• Use quiet hours ({quietHours[0].hour}:00-{quietHours[0].hour + 1}:00) for admin or marketing work</p>
        )}
        <p>• Implement dynamic pricing for peak hours to spread demand</p>
      </div>
    </div>
  );
}
