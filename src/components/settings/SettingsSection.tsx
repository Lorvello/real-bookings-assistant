import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface SettingsSectionProps {
  /** Section heading. Accepts a node so callers can append e.g. an "(optional)" span. */
  title: React.ReactNode;
  /** Optional helper line under the title. */
  description?: React.ReactNode;
  /** Optional info-tooltip shown next to the title. Requires a TooltipProvider ancestor. */
  tooltip?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * The one canonical Settings section primitive. Wraps the shadcn Card +
 * CardHeader/CardTitle pattern that the Operations/Services/Pay&Book tabs already
 * use, so every section across the Settings tab shares one surface, border,
 * heading style and accent instead of each tab hand-rolling its own card markup.
 */
export function SettingsSection({ title, description, tooltip, className, children }: SettingsSectionProps) {
  return (
    <Card className={`border-border ${className ?? ''}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl font-semibold text-foreground">{title}</CardTitle>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
