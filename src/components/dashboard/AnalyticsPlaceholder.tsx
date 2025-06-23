
import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AnalyticsPlaceholder() {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Analytics Dashboard</CardTitle>
        <CardDescription>
          Track your booking performance and customer insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Analytics Coming Soon</h3>
          <p className="text-muted-foreground">
            Detailed analytics and reporting features will be available soon
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
