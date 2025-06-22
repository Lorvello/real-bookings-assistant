
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Euro, TrendingUp, Info } from 'lucide-react';

interface DashboardMetricsProps {
  analytics: any;
  isLoading: boolean;
  showMultiCalendarNote?: boolean;
}

export function DashboardMetrics({ analytics, isLoading, showMultiCalendarNote = false }: DashboardMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showMultiCalendarNote && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">
                Statistieken worden getoond voor de eerste geselecteerde kalender. 
                Gecombineerde statistieken komen binnenkort beschikbaar.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vandaag</p>
                <p className="text-2xl font-bold">{analytics?.today_bookings || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In behandeling</p>
                <p className="text-2xl font-bold">{analytics?.pending_bookings || 0}</p>
              </div>
              <Users className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deze week</p>
                <p className="text-2xl font-bold">{analytics?.week_bookings || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Omzet</p>
                <p className="text-2xl font-bold">€{analytics?.total_revenue?.toFixed(2) || '0.00'}</p>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
