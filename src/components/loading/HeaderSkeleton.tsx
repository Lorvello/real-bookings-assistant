import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function HeaderSkeleton() {
  return (
    <div className="bg-card border-b border-border px-4 py-3 rounded-t-lg">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  );
}
