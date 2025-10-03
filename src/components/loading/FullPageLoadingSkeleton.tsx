import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function FullPageLoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-4 p-8">
        <Skeleton className="h-12 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6 mx-auto" />
      </div>
    </div>
  );
}
