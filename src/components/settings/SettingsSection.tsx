import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Bot } from 'lucide-react';

interface SettingsSectionProps {
  /** Section heading. Accepts a node so callers can append e.g. an "(optional)" span. */
  title: React.ReactNode;
  /** Optional helper line under the title. */
  description?: React.ReactNode;
  /** Optional info-tooltip shown next to the title. Requires a TooltipProvider ancestor. */
  tooltip?: string;
  /** Show a visible "Used by your AI agent" badge — for sections whose fields feed
   *  the WhatsApp agent's knowledge (business_overview / business_overview_v2). */
  usedByAgent?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * The one canonical Settings section primitive. Wraps the shadcn Card +
 * CardHeader/CardTitle pattern that the Operations/Services/Pay&Book tabs already
 * use, so every section across the Settings tab shares one surface, border,
 * heading style and accent instead of each tab hand-rolling its own card markup.
 */
export function SettingsSection({ title, description, tooltip, usedByAgent, className, children }: SettingsSectionProps) {
  return (
    <Card className={className ?? ''}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
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
          {usedByAgent && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Bot className="h-3 w-3" />
              Used by your AI agent
            </span>
          )}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
