
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
  console.log('DashboardMetrics render:', { analytics, isLoading });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse bg-card/50 border-border">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-600 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-600 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show default values if no analytics data
  const displayAnalytics = analytics || {
    today_bookings: 0,
    pending_bookings: 0,
    week_bookings: 0,
    month_bookings: 0,
    total_revenue: 0
  };

  return (
    <div className="space-y-4">
      {showMultiCalendarNote && (
        <Card className="border-blue-200 bg-blue-50/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-300">
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
        <Card className="bg-card/50 border-border hover:bg-card/70 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vandaag</p>
                <p className="text-2xl font-bold text-foreground">{displayAnalytics.today_bookings}</p>
                <p className="text-xs text-muted-foreground">afspraken</p>
              </div>
              <Calendar className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border hover:bg-card/70 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In behandeling</p>
                <p className="text-2xl font-bold text-foreground">{displayAnalytics.pending_bookings}</p>
                <p className="text-xs text-muted-foreground">wachtend op bevestiging</p>
              </div>
              <Users className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border hover:bg-card/70 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deze week</p>
                <p className="text-2xl font-bold text-foreground">{displayAnalytics.week_bookings}</p>
                <p className="text-xs text-muted-foreground">afspraken</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border hover:bg-card/70 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Omzet (maand)</p>
                <p className="text-2xl font-bold text-foreground">€{(displayAnalytics.total_revenue || 0).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">deze maand</p>
              </div>
              <Euro className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Debug Info:</h4>
            <pre className="text-xs text-gray-400 overflow-auto">
              {JSON.stringify({ analytics: displayAnalytics, isLoading }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
