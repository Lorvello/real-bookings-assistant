import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function ConversationsSkeleton() {
  return (
    <div className="flex h-full bg-gray-900">
      {/* Sidebar skeleton */}
      <div className="w-80 border-r border-border p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Chat area skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border p-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} rounded-lg`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
