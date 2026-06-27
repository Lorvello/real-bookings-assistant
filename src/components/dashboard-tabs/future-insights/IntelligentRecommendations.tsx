
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, Users, Calendar, Target, Lightbulb, Heart, Zap, UserPlus,
  Clock, Euro, BarChart3, ArrowUp, AlertTriangle, CheckCircle
} from 'lucide-react';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useOptimizedPerformanceEfficiency } from '@/hooks/dashboard/useOptimizedPerformanceEfficiency';

interface IntelligentRecommendationsProps {
  calendarIds: string[];
  customerGrowthRate?: number;
  capacityUtilization?: number;
  demandForecast?: Array<{
    week_number: number;
    bookings: number;
    trend_direction: string;
  }>;
  seasonalPatterns?: Array<{
    month_name: string;
    avg_bookings: number;
  }>;
}

export function IntelligentRecommendations({
  calendarIds,
  customerGrowthRate,
  capacityUtilization,
  demandForecast,
  seasonalPatterns
}: IntelligentRecommendationsProps) {
  const { t } = useTranslation('dashboard');

  // Get additional data for comprehensive recommendations
  const currentDate = new Date();
  const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const { data: businessIntel } = useOptimizedBusinessIntelligence(
    calendarIds, 
    thirtyDaysAgo, 
    currentDate
  );
  
  const { data: performance } = useOptimizedPerformanceEfficiency(
    calendarIds,
    thirtyDaysAgo,
    currentDate
  );

  const generateRecommendations = () => {
    const recommendations = [];

    // 1. HIGH GROWTH RECOMMENDATION
    if (customerGrowthRate !== undefined && customerGrowthRate > 50) {
      recommendations.push({
        icon: TrendingUp,
        title: t('dashboard.futureInsights.rec.growth.title', 'Excellent Customer Growth!'),
        message: t('dashboard.futureInsights.rec.growth.msg', 'Your {{rate}}% growth rate shows strong market demand. Consider expanding your services or capacity to accommodate more customers.', { rate: customerGrowthRate.toFixed(1) }),
        variant: "purple" as const,
        priority: 1,
        actionItems: [
          t('dashboard.futureInsights.rec.growth.a1', 'Add more service offerings'),
          t('dashboard.futureInsights.rec.growth.a2', 'Extend operating hours'),
          t('dashboard.futureInsights.rec.growth.a3', 'Consider hiring additional staff')
        ]
      });
    }

    // 2. LOW CAPACITY RECOMMENDATION  
    if (capacityUtilization !== undefined && capacityUtilization < 30) {
      recommendations.push({
        icon: Target,
        title: t('dashboard.futureInsights.rec.lowCap.title', 'Optimize Your Schedule!'),
        message: t('dashboard.futureInsights.rec.lowCap.msg', 'Your capacity is underutilized at {{rate}}%. Consider adjusting availability hours or marketing during quiet periods to increase bookings.', { rate: capacityUtilization.toFixed(1) }),
        variant: "purple" as const,
        priority: 1,
        actionItems: [
          t('dashboard.futureInsights.rec.lowCap.a1', 'Review and adjust availability hours'),
          t('dashboard.futureInsights.rec.lowCap.a2', 'Run targeted marketing campaigns'),
          t('dashboard.futureInsights.rec.lowCap.a3', 'Offer promotional pricing during quiet periods')
        ]
      });
    }

    // 3. HIGH CAPACITY RECOMMENDATION
    if (capacityUtilization !== undefined && capacityUtilization > 80) {
      recommendations.push({
        icon: AlertTriangle,
        title: t('dashboard.futureInsights.rec.highCap.title', 'High Demand Detected!'),
        message: t('dashboard.futureInsights.rec.highCap.msg', 'Your calendar is nearly full at {{rate}}%. Consider adding more time slots, extending hours, or raising prices to manage demand.', { rate: capacityUtilization.toFixed(1) }),
        variant: "purple" as const,
        priority: 1,
        actionItems: [
          t('dashboard.futureInsights.rec.highCap.a1', 'Add more appointment slots'),
          t('dashboard.futureInsights.rec.highCap.a2', 'Consider premium pricing'),
          t('dashboard.futureInsights.rec.highCap.a3', 'Extend business hours')
        ]
      });
    }

    // 5. SINGLE SERVICE RECOMMENDATION
    if (businessIntel?.service_performance && businessIntel.service_performance.length === 1) {
      recommendations.push({
        icon: BarChart3,
        title: t('dashboard.futureInsights.rec.singleSvc.title', 'Expand Your Services!'),
        message: t('dashboard.futureInsights.rec.singleSvc.msg', "You're currently offering one service. Consider adding complementary services to increase revenue per customer."),
        variant: "purple" as const,
        priority: 2,
        actionItems: [
          t('dashboard.futureInsights.rec.singleSvc.a1', 'Research complementary services'),
          t('dashboard.futureInsights.rec.singleSvc.a2', 'Survey customers for service ideas'),
          t('dashboard.futureInsights.rec.singleSvc.a3', 'Test new services with existing customers')
        ]
      });
    }

    // 6. PEAK HOUR OPTIMIZATION
    if (performance?.peak_hours && performance.peak_hours.length > 0) {
      const topHour = performance.peak_hours[0];
      const totalBookings = performance.peak_hours.reduce((sum, h) => sum + h.bookings, 0);
      const peakPercentage = totalBookings > 0 ? (topHour.bookings / totalBookings) * 100 : 0;
      
      if (peakPercentage > 40) {
        recommendations.push({
          icon: Clock,
          title: t('dashboard.futureInsights.rec.peak.title', 'Distribute Your Schedule!'),
          message: t('dashboard.futureInsights.rec.peak.msg', 'Most bookings happen at {{time}}. Consider incentivizing off-peak appointments with discounts.', { time: topHour.hour_label }),
          variant: "purple" as const,
          priority: 2,
          actionItems: [
            t('dashboard.futureInsights.rec.peak.a1', 'Offer off-peak discounts'),
            t('dashboard.futureInsights.rec.peak.a2', 'Promote less busy time slots'),
            t('dashboard.futureInsights.rec.peak.a3', 'Create time-based pricing')
          ]
        });
      }
    }

    // (Removed "Weekend Opportunity": it was gated on a stub filter that always
    // returned [], so the recommendation always fired regardless of real weekend
    // activity — a fake, non-data-driven suggestion. Re-add only once peak_hours
    // carries day-of-week data to gate it on real Saturday/Sunday bookings.)

    // 8. PRICING OPTIMIZATION
    if (performance?.booking_completion_rate !== undefined && performance.booking_completion_rate > 90) {
      recommendations.push({
        icon: Euro,
        title: t('dashboard.futureInsights.rec.pricing.title', 'Consider Price Increase!'),
        message: t('dashboard.futureInsights.rec.pricing.msg', 'Your {{rate}}% booking completion rate suggests strong demand. Test higher prices to optimize revenue.', { rate: performance.booking_completion_rate.toFixed(1) }),
        variant: "purple" as const,
        priority: 2,
        actionItems: [
          t('dashboard.futureInsights.rec.pricing.a1', 'Test a 10-15% price increase'),
          t('dashboard.futureInsights.rec.pricing.a2', 'Create premium service tiers'),
          t('dashboard.futureInsights.rec.pricing.a3', 'Monitor booking demand after changes')
        ]
      });
    }

    // Additional smart recommendations based on combined data
    if (customerGrowthRate !== undefined && customerGrowthRate > 0 && customerGrowthRate <= 50) {
      recommendations.push({
        icon: UserPlus,
        title: t('dashboard.futureInsights.rec.steady.title', 'Steady Growth Strategy'),
        message: t('dashboard.futureInsights.rec.steady.msg', "With {{rate}}% growth, you're on track. Focus on customer retention and referral programs to accelerate growth.", { rate: customerGrowthRate.toFixed(1) }),
        variant: "purple" as const,
        priority: 3,
        actionItems: [
          t('dashboard.futureInsights.rec.steady.a1', 'Implement referral rewards'),
          t('dashboard.futureInsights.rec.steady.a2', 'Follow up with happy customers'),
          t('dashboard.futureInsights.rec.steady.a3', 'Create customer testimonials')
        ]
      });
    }

    // Sort by priority and return top 3 most relevant
    return recommendations
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);
  };

  const recommendations = generateRecommendations();

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-muted/40 rounded-2xl flex items-center justify-center border border-white/[0.08]">
          <Target className="h-8 w-8 text-accent-foreground" />
        </div>
        <p className="text-foreground font-medium mb-2">{t('dashboard.futureInsights.rec.emptyTitle', 'Everything looks great!')}</p>
        <p className="text-sm text-muted-foreground">{t('dashboard.futureInsights.rec.emptyDesc', "Your performance is strong. We'll keep monitoring the metrics for new opportunities.")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {recommendations.map((rec, index) => (
        <div
          key={index}
          className="group p-6 surface-raised rounded-xl hover:bg-muted/40 transition-colors duration-150"
          style={{
            animation: `fadeIn 0.6s ease-out ${index * 0.15}s both`
          }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-muted/40 rounded-xl flex items-center justify-center border border-white/[0.08] transition-colors duration-150">
              <rec.icon className="h-6 w-6 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold mb-2 text-foreground group-hover:text-accent-foreground transition-colors duration-300">
                {rec.title}
              </h4>
              <p className="text-foreground text-sm leading-relaxed mb-4">
                {rec.message}
              </p>
              {rec.actionItems && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-accent-foreground uppercase tracking-wider">
                    {t('dashboard.futureInsights.rec.actionsLabel', 'Recommended Actions:')}
                  </p>
                  <ul className="space-y-1">
                    {rec.actionItems.map((action, actionIndex) => (
                      <li key={actionIndex} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></div>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
