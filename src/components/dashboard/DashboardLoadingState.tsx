
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function DashboardLoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
