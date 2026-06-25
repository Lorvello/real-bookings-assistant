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
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading services"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        // Mirror ServiceTypeCard's structure exactly (border, color dot + name,
        // 2 description lines, bottom meta row, a badge) so the real cards swap in
        // with zero layout jump.
        <Card key={i} className="flex h-full flex-col border-white/[0.06]">
          <CardContent className="flex flex-1 flex-col p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="mb-3 space-y-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/5" />
            </div>
            <div className="mt-auto flex items-center gap-2 pt-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="mt-3">
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
