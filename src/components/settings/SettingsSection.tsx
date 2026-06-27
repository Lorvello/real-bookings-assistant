import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Bot, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  /** Section heading. Accepts a node so callers can append e.g. an "(optional)" span. */
  title: React.ReactNode;
  /** Optional helper line under the title. */
  description?: React.ReactNode;
  /** Optional info-tooltip shown next to the title. Requires a TooltipProvider ancestor. */
  tooltip?: string;
  /** Optional leading glyph rendered in a small emerald-washed tile. */
  icon?: LucideIcon;
  /** Optional right-aligned header control (e.g. a toggle or a small action button). */
  action?: React.ReactNode;
  /** Show a visible "Used by your AI agent" badge — for sections whose fields feed
   *  the WhatsApp agent's knowledge (business_overview / business_overview_v2). */
  usedByAgent?: boolean;
  className?: string;
  /** Drop the inner CardContent padding when the child manages its own (e.g. a table). */
  flush?: boolean;
  children: React.ReactNode;
}

/**
 * The one canonical Settings section primitive (PREMIUM_DESIGN_PLAYBOOK §4 Card +
 * §6 Settings). Wraps the luxury-dark <Card> (.surface-raised) so every section
 * across every tab shares one surface, hairline, heading and accent — instead of
 * each tab hand-rolling its own card markup at its own spacing. The optional icon
 * tile + "Used by your AI agent" badge make a section's purpose legible at a glance.
 */
export function SettingsSection({
  title,
  description,
  tooltip,
  icon: Icon,
  action,
  usedByAgent,
  className,
  flush,
  children,
}: SettingsSectionProps) {
  const { t } = useTranslation('settings');
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="gap-1 border-b border-white/[0.05] bg-white/[0.012] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/[0.10] text-accent-foreground">
                <Icon className="h-[18px] w-[18px]" />
              </span>
            )}
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold leading-7 tracking-[-0.015em] text-foreground">
                  {title}
                </h3>
                {tooltip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={t('settings.common.moreInfo', 'More information')}
                        // h-11 w-11 -m-2.5 → a 44px mobile tap target (touch-target, DoD §2)
                        // while the Info glyph stays visually 16px; the negative margin absorbs
                        // the extra size so the header row layout is unchanged. Desktop is
                        // byte-identical via md: resets (24px box, -m-1). One spacious tooltip
                        // per section header, so the enlarged hit-zone can't crowd a dense row.
                        className="-m-2.5 flex h-11 w-11 items-center justify-center rounded-md text-subtle-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:-m-1 md:h-6 md:w-6"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {usedByAgent && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/[0.10] px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                    <Bot className="h-3 w-3" />
                    {t('settings.common.usedByAgent', 'Used by your AI agent')}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-sm leading-5 text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </CardHeader>
      <CardContent className={cn(flush ? 'p-0' : 'p-5 pt-5 md:p-6 md:pt-6')}>
        {children}
      </CardContent>
    </Card>
  );
}
