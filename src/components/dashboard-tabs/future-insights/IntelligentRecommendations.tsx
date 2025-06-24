
import React from 'react';
import { Clock, Users, Calendar, TrendingUp, Target, Lightbulb, Heart, Zap } from 'lucide-react';

interface IntelligentRecommendationsProps {
  // Performance data
  avgResponseTime?: number;
  noShowRate?: number;
  cancellationRate?: number;
  calendarUtilization?: number;
  
  // Future insights data
  waitlistSize?: number;
  returningCustomersMonth?: number;
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
  avgResponseTime,
  noShowRate,
  cancellationRate,
  calendarUtilization,
  waitlistSize,
  returningCustomersMonth,
  demandForecast,
  seasonalPatterns
}: IntelligentRecommendationsProps) {
  
  const generateRecommendations = () => {
    const recommendations = [];

    // Response time recommendations - friendlier tone
    if (avgResponseTime !== undefined) {
      if (avgResponseTime > 15) {
        recommendations.push({
          icon: Clock,
          title: "Faster Response Time Opportunity",
          message: `Your response time is currently ${avgResponseTime.toFixed(1)} minutes. By responding faster (within 5-10 minutes) you increase customer satisfaction and conversion. Consider automatic greetings or push notifications!`,
          variant: "purple" as const,
          priority: 1
        });
      } else if (avgResponseTime > 5) {
        recommendations.push({
          icon: Clock,
          title: "Response Time Optimization Tip",
          message: `With ${avgResponseTime.toFixed(1)} minutes response time you're already doing well! To make it even better: aim for under 5 minutes for maximum customer satisfaction.`,
          variant: "purple" as const,
          priority: 2
        });
      } else {
        recommendations.push({
          icon: Zap,
          title: "Excellent Response Time!",
          message: `Fantastic! Your response time of ${avgResponseTime.toFixed(1)} minutes is excellent. Customers appreciate fast service - this helps your conversion significantly.`,
          variant: "purple" as const,
          priority: 3
        });
      }
    }

    // No-show rate recommendations - more encouraging
    if (noShowRate !== undefined && noShowRate > 10) {
      recommendations.push({
        icon: Calendar,
        title: "No-show Prevention Strategy",
        message: `Your no-show rate of ${noShowRate.toFixed(1)}% offers improvement opportunities. Try sending reminders 24h and 2h in advance. A small deposit can also help increase commitment.`,
        variant: "purple" as const,
        priority: 1
      });
    } else if (noShowRate !== undefined && noShowRate <= 5) {
      recommendations.push({
        icon: Heart,
        title: "Great Reliability!",
        message: `Your no-show rate of ${noShowRate.toFixed(1)}% is excellent! Your customers are reliable and appreciate your service. Keep doing what you're doing!`,
        variant: "purple" as const,
        priority: 3
      });
    }

    // Cancellation rate recommendations - supportive tone
    if (cancellationRate !== undefined && cancellationRate > 20) {
      recommendations.push({
        icon: Users,
        title: "Increase Flexibility",
        message: `With ${cancellationRate.toFixed(1)}% cancellations you can use flexibility as a strength. Offer easy rebooking options and analyze the main reasons for cancellations.`,
        variant: "purple" as const,
        priority: 2
      });
    }

    // Calendar utilization recommendations - growth focused
    if (calendarUtilization !== undefined) {
      if (calendarUtilization > 85) {
        recommendations.push({
          icon: TrendingUp,
          title: "Great Demand - Growth Opportunity!",
          message: `Your calendar is ${calendarUtilization.toFixed(1)}% booked - that's fantastic! This shows strong demand. Consider expansion: extra time slots, staff, or a second location.`,
          variant: "purple" as const,
          priority: 1
        });
      } else if (calendarUtilization < 40) {
        recommendations.push({
          icon: Lightbulb,
          title: "Marketing Growth Opportunities",
          message: `Your calendar still has ${(100 - calendarUtilization).toFixed(1)}% room for more customers. Perfect time for marketing: social media, SEO, or referral campaigns can help you grow.`,
          variant: "purple" as const,
          priority: 2
        });
      } else {
        recommendations.push({
          icon: Target,
          title: "Healthy Utilization Rate",
          message: `Your calendar is ${calendarUtilization.toFixed(1)}% booked - a nice balance! You have room for growth without overload. Perfect foundation for stable growth.`,
          variant: "purple" as const,
          priority: 3
        });
      }
    }

    // Waitlist recommendations - opportunity focused
    if (waitlistSize !== undefined && waitlistSize > 5) {
      recommendations.push({
        icon: Clock,
        title: "Waitlist = Growth Indicator!",
        message: `${waitlistSize} people on your waitlist show strong demand! Consider adding extra time slots or prioritize cancellations to serve these enthusiastic customers.`,
        variant: "purple" as const,
        priority: 1
      });
    }

    // Returning customers recommendations - relationship focused
    if (returningCustomersMonth !== undefined) {
      if (returningCustomersMonth < 3) {
        recommendations.push({
          icon: Heart,
          title: "Strengthen Customer Relations",
          message: `You've had ${returningCustomersMonth} returning customers this month. Opportunity to build loyalty: follow-up service, loyalty programs, or personal attention can make the difference.`,
          variant: "purple" as const,
          priority: 2
        });
      } else if (returningCustomersMonth > 10) {
        recommendations.push({
          icon: Heart,
          title: "Fantastic Customer Loyalty!",
          message: `${returningCustomersMonth} returning customers this month show great loyalty! You're doing excellently. Ask for reviews and referrals - satisfied customers are your best ambassadors.`,
          variant: "purple" as const,
          priority: 3
        });
      }
    }

    // Demand forecast recommendations - strategic
    if (demandForecast && demandForecast.length > 0) {
      const trendUp = demandForecast.filter(week => week.trend_direction === 'up').length;
      const trendDown = demandForecast.filter(week => week.trend_direction === 'down').length;

      if (trendUp > trendDown) {
        recommendations.push({
          icon: TrendingUp,
          title: "Growing Demand Predicted!",
          message: `Trends show growing demand in the coming weeks. Great news! Prepare extra capacity and consider seasonal pricing during peak periods.`,
          variant: "purple" as const,
          priority: 2
        });
      } else if (trendDown > trendUp) {
        recommendations.push({
          icon: Lightbulb,
          title: "Marketing Opportunity Spotted",
          message: `Trends show opportunity for more customers. Perfect time for promotions, new service introduction, or a referral campaign to create momentum.`,
          variant: "purple" as const,
          priority: 1
        });
      }
    }

    // Seasonal recommendations - preparation focused
    if (seasonalPatterns && seasonalPatterns.length > 0) {
      const currentMonth = new Date().getMonth();
      const currentPattern = seasonalPatterns[currentMonth];
      const avgPattern = seasonalPatterns.reduce((sum, month) => sum + month.avg_bookings, 0) / seasonalPatterns.length;
      
      if (currentPattern && currentPattern.avg_bookings > avgPattern * 1.5) {
        recommendations.push({
          icon: Calendar,
          title: "Seasonal Success Opportunity",
          message: `${currentPattern.month_name} is historically a strong month for you! Make sure you're prepared: sufficient capacity and staff planning maximize your success opportunities.`,
          variant: "purple" as const,
          priority: 2
        });
      }
    }

    // Sort by priority and return top 6
    return recommendations
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 6);
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {recommendations.map((rec, index) => (
        <div
          key={index}
          className="p-6 bg-gradient-to-br from-purple-500/15 via-purple-500/10 to-transparent border border-purple-500/30 rounded-xl backdrop-blur-sm"
          style={{
            animation: `fadeIn 0.6s ease-out ${index * 0.1}s both`
          }}
        >
          <h4 className="font-bold mb-3 flex items-center gap-2 text-purple-300">
            <rec.icon className="h-5 w-5" />
            {rec.title}
          </h4>
          <p className="text-slate-300 text-sm leading-relaxed">
            {rec.message}
          </p>
        </div>
      ))}
    </div>
  );
}
