
import React from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useNextAppointment } from '@/hooks/dashboard/useNextAppointment';
import { usePopularService } from '@/hooks/dashboard/usePopularService';
import { useWeeklyInsights } from '@/hooks/dashboard/useWeeklyInsights';
import { CalendarManagement } from '@/components/dashboard/CalendarManagement';
import { Clock, Star, TrendingUp, TrendingDown, Calendar, User, Award, Activity, Target, ArrowUp, ArrowDown, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CountUp } from '@/components/ui/CountUp';
import { motion, MotionConfig } from 'framer-motion';
import { SubscriptionOverview } from '@/components/ui/SubscriptionOverview';
import { useMockDataControl } from '@/hooks/useMockDataControl';

interface OverviewTabProps {
  calendarIds: string[];
}

export function OverviewTab({ calendarIds }: OverviewTabProps) {
  const { calendars } = useCalendarContext();
  const { useMockData } = useMockDataControl();

  // Fetch data using the aggregated hooks
  const next = useNextAppointment(calendarIds);
  const popular = usePopularService(calendarIds);
  const weekly = useWeeklyInsights(calendarIds);

  const { data: nextAppointment } = next;
  const { data: popularService } = popular;
  const { data: weeklyInsights } = weekly;

  const isLoading = next.isLoading || popular.isLoading || weekly.isLoading;
  const isError = next.isError || popular.isError || weekly.isError;

  const retryAll = () => {
    next.refetch();
    popular.refetch();
    weekly.refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* exact-shape skeleton mirrors the new layout: a wide hero band + a 2-card
            supporting row → no layout shift when data lands */}
        <div className="surface-raised shimmer rounded-xl md:rounded-2xl p-4 md:p-8">
          <div className="h-3 w-28 rounded bg-white/[0.06]" />
          <div className="mt-3 h-9 md:h-11 w-40 md:w-56 rounded bg-white/[0.07]" />
          <div className="mt-3 h-3 w-44 rounded bg-white/[0.04]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="surface-raised shimmer rounded-lg md:rounded-2xl min-h-[72px] md:min-h-[11rem] p-3 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="h-3 w-20 rounded bg-white/[0.06]" />
                <div className="h-8 w-8 md:h-12 md:w-12 rounded-xl bg-white/[0.04]" />
              </div>
              <div className="h-7 md:h-9 w-24 md:w-28 rounded bg-white/[0.07] mb-2 md:mb-3" />
              <div className="hidden md:block h-3 w-32 rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
        <div className="surface-raised shimmer rounded-xl h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.07] bg-card px-6 py-12 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Couldn't load your dashboard data</p>
        <p className="text-xs text-subtle-foreground">Check your connection and try again.</p>
        <Button variant="secondary" size="sm" onClick={retryAll} className="mt-1 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative isolate space-y-1 md:space-y-8">
      {/* Ambient accent haze across the top of the dashboard — atmosphere (§2) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 left-0 right-0 h-44 -z-10"
        style={{ background: 'radial-gradient(45% 70% at 22% 0%, hsl(var(--primary) / 0.10), transparent 70%)' }}
      />
      {useMockData && (
        <div className="flex items-center justify-end">
          <Badge variant="secondary" className="bg-muted text-subtle-foreground ring-1 ring-white/[0.06] text-[10px] font-medium uppercase tracking-wider">
            Sample data
          </Badge>
        </div>
      )}
      {/* ── THE SIGNATURE ─────────────────────────────────────────────────
          The glowing "today" hero (SPEC §0): a single dominant panel that is the
          light source of the canvas. It answers "what's happening now" — the next
          appointment — in dramatic scale, with a localized backlight leaking from
          its lower edge (§2 backlight) so the panel reads as emitting the accent
          light. The supporting KPIs sit smaller beneath it → clear big/small
          hierarchy (one thing well). Reuses existing data; no new backend. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="relative glow-accent-strong surface-raised overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-8">
          {/* backlight: panel emits light from its lower edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 left-1/4 right-1/4 h-28 z-0"
            style={{ background: 'radial-gradient(60% 100% at 50% 100%, hsl(var(--primary) / 0.20), transparent 70%)' }}
          />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-eyebrow uppercase text-subtle-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-accent-foreground" /> Next appointment
              </p>
              {nextAppointment ? (
                <>
                  <div className="mt-2 md:mt-3 text-3xl md:text-display-hero font-semibold leading-none tabular-nums tracking-[-0.03em] text-foreground">
                    {nextAppointment.time_until}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground truncate">
                    {nextAppointment.service_name} <span className="text-subtle-foreground">·</span> {nextAppointment.customer_name}
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-2 md:mt-3 font-serif italic text-2xl md:text-4xl text-foreground/90 leading-tight">
                    All clear for now
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Nothing scheduled today. Enjoy the quiet.
                  </p>
                </>
              )}
            </div>

            {/* supporting inline stat: this week's momentum (reuses weeklyInsights) */}
            {weeklyInsights ? (
              <div className="flex shrink-0 items-center gap-4 rounded-lg bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.06]">
                <div>
                  <p className="text-eyebrow uppercase text-subtle-foreground">This week</p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-foreground">
                    <CountUp value={weeklyInsights.current_week || 0} />
                    <span className="ml-1 text-sm font-medium text-subtle-foreground">booked</span>
                  </p>
                </div>
                {weeklyInsights.trend === 'up' ? (
                  <span className="flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success-foreground">
                    <TrendingUp className="h-3.5 w-3.5" /> {Math.abs(weeklyInsights.growth_percentage)}%
                  </span>
                ) : weeklyInsights.trend === 'down' ? (
                  <span className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive-foreground">
                    <TrendingDown className="h-3.5 w-3.5" /> {Math.abs(weeklyInsights.growth_percentage)}%
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Supporting KPI row — smaller than the hero (deliberate hierarchy) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        {/* Popular Service Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative group"
        >
          <div className="relative glow-accent surface-raised rounded-lg md:rounded-2xl min-h-[72px] md:min-h-[11rem] p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-4">
              <h3 className="text-[11px] md:text-xs font-semibold text-subtle-foreground uppercase tracking-[0.08em]">
                Popular Service
              </h3>
              <div className="w-4 h-4 md:w-12 md:h-12 bg-primary/10 ring-1 ring-primary/20 rounded-md md:rounded-xl flex items-center justify-center">
                <TrendingUp className="h-2 w-2 md:h-6 md:w-6 text-accent-foreground" />
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              {popularService ? (
                <>
                  <div className="text-lg md:text-4xl font-semibold text-foreground leading-none tabular-nums tracking-[-0.03em] mb-0.5 md:mb-2">
                    <CountUp value={popularService.percentage} />%
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground font-medium truncate">
                    {popularService.service_name} • {popularService.booking_count} bookings
                  </div>
                </>
              ) : (
                <>
                  <div className="text-base md:text-lg font-medium leading-snug text-foreground/80 mb-0.5 md:mb-1.5">
                    No bookings yet
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    Your most-booked service will appear here.
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Weekly Growth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative group"
        >
          <div className="relative glow-accent surface-raised rounded-lg md:rounded-2xl min-h-[72px] md:min-h-[11rem] p-3 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-4">
              <h3 className="text-[11px] md:text-xs font-semibold text-subtle-foreground uppercase tracking-[0.08em]">
                Weekly Growth
              </h3>
              <div className="w-4 h-4 md:w-12 md:h-12 bg-primary/10 ring-1 ring-primary/20 rounded-md md:rounded-xl flex items-center justify-center">
                <BarChart3 className="h-2 w-2 md:h-6 md:w-6 text-accent-foreground" />
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              {weeklyInsights ? (
                <>
                  <div className="text-lg md:text-4xl font-semibold text-foreground leading-none tabular-nums tracking-[-0.03em] mb-0.5 md:mb-2">
                    {weeklyInsights.trend === 'up' ? '+' : weeklyInsights.trend === 'down' ? '-' : ''}
                    <CountUp value={Math.abs(weeklyInsights.growth_percentage)} />%
                  </div>
                  <div className="flex items-center gap-1.5 text-xs md:text-sm font-medium truncate">
                    {weeklyInsights.trend === 'up' ? (
                      <span className="flex items-center gap-1 text-success-foreground">
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4" /> Rising
                      </span>
                    ) : weeklyInsights.trend === 'down' ? (
                      <span className="flex items-center gap-1 text-destructive-foreground">
                        <TrendingDown className="h-3 w-3 md:h-4 md:w-4" /> Falling
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Stable</span>
                    )}
                    <span className="text-subtle-foreground hidden md:inline">vs last week</span>
                  </div>
                  {/* micro-chart: last vs this week — baseline gridline, labeled values,
                      hover shows exact count, bars draw up on view (§5/§9) */}
                  {(() => {
                    const prev = weeklyInsights.previous_week || 0;
                    const cur = weeklyInsights.current_week || 0;
                    const max = Math.max(prev, cur, 1);
                    const delta = cur - prev;
                    return (
                      <div className="hidden md:block mt-4">
                        <div className="flex items-end gap-2 h-10 border-b border-white/[0.06]">
                          <div
                            title={`Last week: ${prev} bookings`}
                            className="bar-grow flex-1 rounded-t-sm bg-white/[0.10] transition-colors hover:bg-white/[0.16]"
                            style={{ height: `${Math.max(10, (prev / max) * 100)}%`, animationDelay: '0.25s' }}
                          />
                          <div
                            title={`This week: ${cur} bookings (${delta >= 0 ? '+' : ''}${delta} vs last)`}
                            className="bar-grow flex-1 rounded-t-sm bg-gradient-to-t from-primary/40 to-primary shadow-[0_0_16px_-4px_hsl(var(--primary)/0.5)]"
                            style={{ height: `${Math.max(10, (cur / max) * 100)}%`, animationDelay: '0.35s' }}
                          />
                        </div>
                        <div className="mt-1.5 flex justify-between text-[10px] font-medium text-subtle-foreground tabular-nums">
                          <span>Last · {prev}</span>
                          <span className="text-accent-foreground">This · {cur}</span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <>
                  <div className="text-base md:text-lg font-medium leading-snug text-foreground/80 mb-0.5 md:mb-1.5">
                    Tracking starts soon
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">
                    Week-over-week trends after your first bookings.
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Calendar Management Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <CalendarManagement calendars={calendars} />
      </motion.div>

      {/* Subscription Overview - Only on Overview tab */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <SubscriptionOverview />
      </motion.div>
    </div>
    </MotionConfig>
  );
}
