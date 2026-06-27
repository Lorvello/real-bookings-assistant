import React from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Cold-load placeholder for the Settings tab. Shown while the initial settings
 * data is still being fetched (before profileData has an id), so the user sees a
 * premium skeleton instead of a flash of empty inputs. Lives inside the Settings
 * `dark` scope, so it renders with the dark design tokens like everything else.
 */
export function SettingsSkeleton() {
  const { t } = useTranslation('settings');
  return (
    <div className="space-y-3 md:space-y-6" aria-busy="true" aria-label={t('settings.common.loadingSettings', 'Loading settings')}>
      {/* Tab bar */}
      <div className="grid w-full grid-cols-6 gap-1 rounded-md bg-muted/50 p-1 md:p-2 h-12 md:h-14">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-full w-full rounded-sm" />
        ))}
      </div>

      {/* Two placeholder section cards */}
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="border-border">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
