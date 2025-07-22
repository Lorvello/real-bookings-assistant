
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface PerformanceEfficiencyTabProps {
  calendarIds: string[];
  dateRange: any;
}

export function PerformanceEfficiencyTab({ calendarIds, dateRange }: PerformanceEfficiencyTabProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Performance & Efficiency</h2>
          <p className="text-slate-400 mt-1">Performance metrics and efficiency analytics</p>
        </div>
        {calendarIds.length > 1 && (
          <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-500/30">
            {calendarIds.length} calendars • Primary view
          </Badge>
        )}
      </div>

      {/* Coming Soon Notice */}
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 shadow-xl">
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-100 mb-2">Performance & Efficiency Analytics</h3>
          <p className="text-slate-400 mb-4">
            Detailed performance metrics, no-show rates, and efficiency analytics are being developed.
          </p>
          <p className="text-sm text-slate-500">
            This tab will show comprehensive performance data across {calendarIds.length > 1 ? 'all selected calendars' : 'your calendar'}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
