import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function CalendarGridSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* Header row */}
      <div className="grid grid-cols-7 gap-2">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      
      {/* Calendar grid */}
      {[...Array(5)].map((_, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, dayIndex) => (
            <Skeleton key={dayIndex} className="h-24 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
