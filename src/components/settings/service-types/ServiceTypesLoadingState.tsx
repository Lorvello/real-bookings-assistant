
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function ServiceTypesLoadingState() {
  return (
    <Card className="border-border">
      <CardContent className="flex items-center justify-center py-12">
        <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto"></div>
      </CardContent>
    </Card>
  );
}
