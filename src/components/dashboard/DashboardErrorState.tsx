
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardErrorStateProps {
  error: Error;
}

export function DashboardErrorState({ error }: DashboardErrorStateProps) {
  console.error('Dashboard analytics error:', error);
  
  return (
    <Card className="col-span-full">
      <CardContent className="p-6">
        <div className="text-center text-red-600">
          <p>Error loading dashboard data</p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
