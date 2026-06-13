import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Cold-load placeholder for the Services grid. Renders skeleton cards in the same
 * grid as the real service cards instead of a bare "Loading services..." line, so
 * the layout doesn't jump and the wait feels premium.
 */
export function ServiceTypesLoadingState() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      aria-busy="true"
      aria-label="Loading services"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
