
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './dashboard-tabs/OverviewTab';
import { BusinessIntelligenceTab } from './dashboard-tabs/BusinessIntelligenceTab';
import { PerformanceEfficiencyTab } from './dashboard-tabs/PerformanceEfficiencyTab';
import { LiveOperationsTab } from './dashboard-tabs/LiveOperationsTab';
import { FutureInsightsTab } from './dashboard-tabs/FutureInsightsTab';
import { LockedTabPanel } from './dashboard-tabs/LockedTabPanel';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { DateRange } from '@/utils/dateRangePresets';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { 
  LayoutDashboard,
  TrendingUp, 
  Activity, 
  Radio, 
  Brain,
  Lock
} from 'lucide-react';

interface DashboardTabsProps {
  calendarIds: string[];
  dateRange: DateRange;
  onTabChange?: (tab: string) => void;
}

export function DashboardTabs({ calendarIds, dateRange, onTabChange }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { t } = useTranslation('dashboard');
  const { checkAccess } = useAccessControl();
  const { userStatus } = useUserStatus();

  // Tabs the user has actually opened at least once this session (IUX R39).
  // Radix TabsContent unmounts its subtree when inactive by default, so every
  // re-visit to an already-seen tab replayed its loading skeleton AND its whole
  // framer-motion entrance from scratch (screenshot-proven: Overview -> Live
  // Operations -> back to Overview re-faded every time). The fix keeps a
  // once-visited tab's panel mounted (forceMount + CSS-hidden instead of
  // removed from the DOM) so switching back is instant. Deliberately NOT
  // force-mounting all 5 tabs unconditionally up front: that mounted every
  // Pro-locked tab's real data-fetching component simultaneously on first
  // dashboard load regardless of access/visit state, which collided on
  // concurrent Supabase realtime-channel subscriptions for the same
  // calendarId and crashed the route. Lazy-mount-on-first-visit, keep-alive
  // after avoids that entirely: at most the tabs the user actually clicked
  // are ever mounted together.
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['overview']));

  const handleTabChange = (value: string) => {
    // Restricted (Pro) tabs still switch: their TabsContent renders the
    // AccessBlockedOverlay with its upgrade CTA. Previously an early return after
    // a transient toast meant setActiveTab never ran, so the upgrade overlay (the
    // conversion driver) was unreachable dead code, only the toast showed. The
    // per-tab access gate + lock badge live in the TabsContent/TabsTrigger.
    setActiveTab(value);
    setVisitedTabs((prev) => (prev.has(value) ? prev : new Set(prev).add(value)));
    onTabChange?.(value);
  };

  const handleUpgrade = () => {
    setShowSubscriptionModal(true);
  };

  const hasBusinessIntelligenceAccess = checkAccess('canAccessBusinessIntelligence');
  const hasPerformanceAccess = checkAccess('canAccessPerformance');
  const hasFutureInsightsAccess = checkAccess('canAccessFutureInsights');

  // Premium underline tabs (one accent), replacing the old 5-color pill bar.
  // min-h-11 = 44px tap target on mobile (A1b touch-target sweep); md:min-h-0
  // reverts to the natural py-2.5 height on desktop, so desktop is unchanged.
  // B1 premium pass: drop the local `transition-colors` + `shadow-none` overrides so
  // the ui/tabs base wins. The active underline keeps its designed soft accent glow
  // (`shadow-[0_3px_14px_-3px_primary/0.7]`) and ALL state changes ease over 200ms
  // (color, border, bg AND box-shadow), reduced-motion-safe via the global block.
  const triggerClass =
    'relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 min-h-11 md:min-h-0 text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground';
  const proBadgeClass =
    'ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground ring-1 ring-primary/20';

  return (
    <div className="space-y-6">
      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* Horizontal tab scroll on mobile: a right-edge fade hints there are more
            tabs (the Pro tabs) past the viewport — fixes the iOS "Pro tabs
            undiscovered" wart (EINDRAPPORT C7). Hidden on md+ where all tabs fit. */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent md:hidden"
          />
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="flex h-auto w-max min-w-full justify-start gap-1 rounded-none border-b border-white/[0.06] bg-transparent p-0 md:w-full">
            <TabsTrigger
              value="overview"
              className={triggerClass}
            >
              <LayoutDashboard className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm whitespace-nowrap">{t('dashboard.tab.overview', 'Overview')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="live-operations"
              className={triggerClass}
            >
              <Radio className="h-3 w-3 md:h-4 md:w-4" />
              <span className="text-xs md:text-sm whitespace-nowrap">{t('dashboard.tab.liveOps', 'Live Operations')}</span>
            </TabsTrigger>
            <TabsTrigger
              value="business-intelligence"
              className={`${triggerClass} ${!hasBusinessIntelligenceAccess ? 'opacity-70' : ''}`}
            >
              {hasBusinessIntelligenceAccess ? (
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="text-xs md:text-sm whitespace-nowrap">{t('dashboard.tab.bi', 'Business Intelligence')}</span>
              {!hasBusinessIntelligenceAccess && <span className={proBadgeClass}>{t('dashboard.proBadge', 'Pro')}</span>}
            </TabsTrigger>
            <TabsTrigger
              value="performance-efficiency"
              className={`${triggerClass} ${!hasPerformanceAccess ? 'opacity-70' : ''}`}
            >
              {hasPerformanceAccess ? (
                <Activity className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="text-xs md:text-sm whitespace-nowrap">{t('dashboard.tab.performance', 'Performance')}</span>
              {!hasPerformanceAccess && <span className={proBadgeClass}>{t('dashboard.proBadge', 'Pro')}</span>}
            </TabsTrigger>
            <TabsTrigger
              value="future-insights"
              className={`${triggerClass} ${!hasFutureInsightsAccess ? 'opacity-70' : ''}`}
            >
              {hasFutureInsightsAccess ? (
                <Brain className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
              )}
              <span className="text-xs md:text-sm whitespace-nowrap">{t('dashboard.tab.futureInsights', 'Future Insights')}</span>
              {!hasFutureInsightsAccess && <span className={proBadgeClass}>{t('dashboard.proBadge', 'Pro')}</span>}
            </TabsTrigger>
          </TabsList>
          </div>
        </div>

        {/* Tab Content.
            IUX R39: keep-alive-after-first-visit instead of Radix's default
            unmount-when-inactive, so re-visiting a tab is instant (no re-fade,
            no re-fetch skeleton). `forceMount` only applies to tabs already in
            visitedTabs (a tab you have not opened yet stays fully unmounted,
            exactly like before); the component inside is likewise only
            rendered once visited. This is deliberately NOT "mount all 5 up
            front": an earlier attempt at unconditional forceMount on every
            tab crashed the route (5 tabs' real components, including the
            Pro-locked ones, all mounting simultaneously on first dashboard
            load collided on concurrent Supabase realtime-channel
            subscriptions for the same calendarId). Lazy-mount-on-first-visit,
            keep-alive-after keeps at most the tabs the user actually clicked
            mounted together, so the fix cannot reintroduce that crash. */}
        <TabsContent value="overview" {...(visitedTabs.has('overview') ? { forceMount: true as const } : {})} className="data-[state=inactive]:hidden">
          <div className="surface-raised rounded-xl p-0.5 md:p-6">
            {visitedTabs.has('overview') && <OverviewTab calendarIds={calendarIds} />}
          </div>
        </TabsContent>

        <TabsContent value="business-intelligence" {...(visitedTabs.has('business-intelligence') ? { forceMount: true as const } : {})} className="data-[state=inactive]:hidden">
          <div className="surface-raised rounded-xl p-0.5 md:p-6">
            {visitedTabs.has('business-intelligence') && (
              hasBusinessIntelligenceAccess ? (
                <BusinessIntelligenceTab
                  calendarIds={calendarIds}
                  dateRange={dateRange}
                />
              ) : (
                <LockedTabPanel
                  feature={t('dashboard.tab.bi', 'Business Intelligence')}
                  description={t('dashboard.locked.biDesc', 'Advanced business metrics, revenue analytics and service performance to grow your business.')}
                  bullets={[t('dashboard.locked.biBullet1', 'Revenue & service analytics'), t('dashboard.locked.biBullet2', 'Top-performing services'), t('dashboard.locked.biBullet3', 'Growth trends over time')]}
                  icon={TrendingUp}
                  onUpgrade={handleUpgrade}
                />
              )
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance-efficiency" {...(visitedTabs.has('performance-efficiency') ? { forceMount: true as const } : {})} className="data-[state=inactive]:hidden">
          <div className="surface-raised rounded-xl p-0.5 md:p-6">
            {visitedTabs.has('performance-efficiency') && (
              hasPerformanceAccess ? (
                <PerformanceEfficiencyTab
                  calendarIds={calendarIds}
                  dateRange={dateRange}
                />
              ) : (
                <LockedTabPanel
                  feature={t('dashboard.locked.perfFeature', 'Performance & Efficiency')}
                  description={t('dashboard.locked.perfDesc', 'Performance metrics, no-show rates, customer satisfaction and efficiency analytics.')}
                  bullets={[t('dashboard.locked.perfBullet1', 'No-show & efficiency rates'), t('dashboard.locked.perfBullet2', 'Peak-hour analysis'), t('dashboard.locked.perfBullet3', 'Customer satisfaction scores')]}
                  icon={Activity}
                  onUpgrade={handleUpgrade}
                />
              )
            )}
          </div>
        </TabsContent>

        <TabsContent value="live-operations" {...(visitedTabs.has('live-operations') ? { forceMount: true as const } : {})} className="data-[state=inactive]:hidden">
          <div className="surface-raised rounded-xl p-0.5 md:p-6">
            {visitedTabs.has('live-operations') && <LiveOperationsTab calendarIds={calendarIds} />}
          </div>
        </TabsContent>

        <TabsContent value="future-insights" {...(visitedTabs.has('future-insights') ? { forceMount: true as const } : {})} className="data-[state=inactive]:hidden">
          <div className="surface-raised rounded-xl p-0.5 md:p-6">
            {visitedTabs.has('future-insights') && (
              hasFutureInsightsAccess ? (
                <FutureInsightsTab calendarIds={calendarIds} />
              ) : (
                <LockedTabPanel
                  feature={t('dashboard.tab.futureInsights', 'Future Insights')}
                  description={t('dashboard.locked.futureDesc', 'Advanced predictions, seasonal patterns and AI recommendations to grow your business.')}
                  bullets={[t('dashboard.locked.futureBullet1', 'Demand forecasting'), t('dashboard.locked.futureBullet2', 'Seasonal booking patterns'), t('dashboard.locked.futureBullet3', 'AI growth recommendations')]}
                  icon={Brain}
                  onUpgrade={handleUpgrade}
                />
              )
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        userType={userStatus.userType}
      />
    </div>
  );
}
