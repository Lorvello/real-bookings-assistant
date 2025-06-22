
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DashboardStatusIndicator() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Dashboard Updates: Live
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Booking Sync: Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Laatste update: {new Date().toLocaleTimeString('nl-NL')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
