
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string | React.ReactNode;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  // Kept for API compatibility with existing callers; color-coding was removed
  // per the premium playbook (#3 one accent, #15 restraint) so all tiles are neutral.
  variant?: 'blue' | 'green' | 'orange' | 'purple';
  delay: number;
  change?: {
    value: number;
    isPositive: boolean;
    icon: LucideIcon;
  };
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  delay,
  change
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative"
    >
      {/* PLAYBOOK §4 KPI tile: neutral raised card, hairline border, NO gradient,
          NO glow, NO hover-scale. Depth comes from the lighter card surface. */}
      <div className="relative bg-card border border-white/[0.08] hover:border-white/[0.12] rounded-xl transition-colors duration-150 h-28 md:h-44 flex flex-col justify-between p-4 md:p-6">

        {/* Header: uppercase micro-label overline + neutral icon chip */}
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-[0.06em] truncate">
              {title}
            </div>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white/[0.04] border border-white/[0.06] rounded-lg flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 md:h-5 md:w-5 text-subtle-foreground" />
          </div>
        </div>

        {/* Main value: neutral hero number, tabular so columns never jitter */}
        <div className="flex-1 flex items-center">
          <p className="text-2xl md:text-4xl font-semibold tracking-[-0.02em] text-foreground leading-none tabular-nums">
            {value}
          </p>
        </div>

        {/* Footer: subtitle, or a tinted delta pill (semantic green/red is allowed for a real change) */}
        <div className="flex items-center justify-between mt-auto">
          {change ? (
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium tabular-nums ring-1 ${
                change.isPositive
                  ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 ring-rose-500/20'
              }`}>
                <change.icon className="h-3 w-3" />
                <span>
                  {change.isPositive ? '+' : ''}{Math.abs(change.value).toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs md:text-sm text-muted-foreground font-medium truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
