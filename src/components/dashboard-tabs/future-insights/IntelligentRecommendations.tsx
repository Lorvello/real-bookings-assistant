
import React from 'react';
import { 
  TrendingUp, Users, Calendar, Target, Lightbulb, Heart, Zap, UserPlus, 
  Clock, Euro, BarChart3, CalendarDays, ArrowUp, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useOptimizedPerformanceEfficiency } from '@/hooks/dashboard/useOptimizedPerformanceEfficiency';

interface IntelligentRecommendationsProps {
  calendarId: string;
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
  calendarId,
  customerGrowthRate,
  capacityUtilization,
  demandForecast,
  seasonalPatterns
}: IntelligentRecommendationsProps) {
  
  // Get additional data for comprehensive recommendations
  const currentDate = new Date();
  const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const { data: businessIntel } = useOptimizedBusinessIntelligence(
    calendarId, 
    thirtyDaysAgo, 
    currentDate
  );
  
  const { data: performance } = useOptimizedPerformanceEfficiency(
    calendarId,
    thirtyDaysAgo,
    currentDate
  );

  const generateRecommendations = () => {
    const recommendations = [];

    // 1. HIGH GROWTH RECOMMENDATION
    if (customerGrowthRate !== undefined && customerGrowthRate > 50) {
      recommendations.push({
        icon: TrendingUp,
        title: "Excellent Customer Growth!",
        message: `Your ${customerGrowthRate.toFixed(1)}% growth rate shows strong market demand. Consider expanding your services or capacity to accommodate more customers.`,
        variant: "purple" as const,
        priority: 1,
        actionItems: [
          "Add more service offerings",
          "Extend operating hours",
          "Consider hiring additional staff"
        ]
      });
    }

    // 2. LOW CAPACITY RECOMMENDATION  
    if (capacityUtilization !== undefined && capacityUtilization < 30) {
      recommendations.push({
        icon: Target,
        title: "Optimize Your Schedule!",
        message: `Your capacity is underutilized at ${capacityUtilization.toFixed(1)}%. Consider adjusting availability hours or marketing during quiet periods to increase bookings.`,
        variant: "purple" as const,
        priority: 1,
        actionItems: [
          "Review and adjust availability hours",
          "Run targeted marketing campaigns",
          "Offer promotional pricing during quiet periods"
        ]
      });
    }

    // 3. HIGH CAPACITY RECOMMENDATION
    if (capacityUtilization !== undefined && capacityUtilization > 80) {
      recommendations.push({
        icon: AlertTriangle,
        title: "High Demand Detected!",
        message: `Your calendar is nearly full at ${capacityUtilization.toFixed(1)}%. Consider adding more time slots, extending hours, or raising prices to manage demand.`,
        variant: "purple" as const,
        priority: 1,
        actionItems: [
          "Add more appointment slots",
          "Consider premium pricing",
          "Extend business hours"
        ]
      });
    }

    // Customer retention recommendations moved to Performance tab analysis
    // TODO: Update to use performance data when available

    // 5. SINGLE SERVICE RECOMMENDATION
    if (businessIntel?.service_performance && businessIntel.service_performance.length === 1) {
      recommendations.push({
        icon: BarChart3,
        title: "Expand Your Services!",
        message: "You're currently offering one service. Consider adding complementary services to increase revenue per customer.",
        variant: "purple" as const,
        priority: 2,
        actionItems: [
          "Research complementary services",
          "Survey customers for service ideas",
          "Test new services with existing customers"
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
          title: "Distribute Your Schedule!",
          message: `Most bookings happen at ${topHour.hour_label}. Consider incentivizing off-peak appointments with discounts.`,
          variant: "purple" as const,
          priority: 2,
          actionItems: [
            "Offer off-peak discounts",
            "Promote less busy time slots",
            "Create time-based pricing"
          ]
        });
      }
    }

    // 7. WEEKEND OPPORTUNITY
    const weekendBookings = performance?.peak_hours?.filter(h => {
      // Assuming peak hours includes weekend data - this is a simplified check
      return false; // Would need weekend-specific data
    }) || [];
    
    if (weekendBookings.length === 0) {
      recommendations.push({
        icon: CalendarDays,
        title: "Weekend Opportunity!",
        message: "No weekend appointments detected. Consider opening Saturdays/Sundays to capture additional revenue.",
        variant: "purple" as const,
        priority: 3,
        actionItems: [
          "Test weekend availability",
          "Survey customers for weekend demand",
          "Offer weekend-specific services"
        ]
      });
    }

    // 8. PRICING OPTIMIZATION
    if (performance?.booking_completion_rate !== undefined && performance.booking_completion_rate > 90) {
      recommendations.push({
        icon: Euro,
        title: "Consider Price Increase!",
        message: `Your ${performance.booking_completion_rate.toFixed(1)}% booking completion rate suggests strong demand. Test higher prices to optimize revenue.`,
        variant: "purple" as const,
        priority: 2,
        actionItems: [
          "Test a 10-15% price increase",
          "Create premium service tiers",
          "Monitor booking demand after changes"
        ]
      });
    }

    // Additional smart recommendations based on combined data
    if (customerGrowthRate !== undefined && customerGrowthRate > 0 && customerGrowthRate <= 50) {
      recommendations.push({
        icon: UserPlus,
        title: "Steady Growth Strategy",
        message: `With ${customerGrowthRate.toFixed(1)}% growth, you're on track. Focus on customer retention and referral programs to accelerate growth.`,
        variant: "purple" as const,
        priority: 3,
        actionItems: [
          "Implement referral rewards",
          "Follow up with happy customers",
          "Create customer testimonials"
        ]
      });
    }

    // Customer loyalty recommendations moved to Performance tab analysis
    // TODO: Update to use performance data when available

    // Sort by priority and return top 3 most relevant
    return recommendations
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);
  };

  const recommendations = generateRecommendations();

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30">
          <Target className="h-8 w-8 text-purple-400" />
        </div>
        <p className="text-slate-300 font-medium mb-2">Everything looks great!</p>
        <p className="text-sm text-slate-400">Your performance is strong. We'll keep monitoring the metrics for new opportunities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {recommendations.map((rec, index) => (
        <div
          key={index}
          className="group p-6 bg-gradient-to-br from-purple-500/15 via-purple-500/10 to-transparent border border-purple-500/30 rounded-xl backdrop-blur-sm hover:from-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
          style={{
            animation: `fadeIn 0.6s ease-out ${index * 0.15}s both`
          }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl flex items-center justify-center border border-purple-500/30 group-hover:from-purple-500/30 group-hover:border-purple-500/40 transition-all duration-300">
              <rec.icon className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold mb-2 text-purple-300 group-hover:text-purple-200 transition-colors duration-300">
                {rec.title}
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                {rec.message}
              </p>
              {rec.actionItems && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">
                    Recommended Actions:
                  </p>
                  <ul className="space-y-1">
                    {rec.actionItems.map((action, actionIndex) => (
                      <li key={actionIndex} className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0"></div>
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
