
import React from 'react';
import { TrendingUp, Users, Calendar, Target, Lightbulb, Heart, Zap, UserPlus } from 'lucide-react';

interface IntelligentRecommendationsProps {
  // Performance data
  bookingEfficiency?: number;
  noShowRate?: number;
  cancellationRate?: number;
  avgRevenuePerDay?: number;
  
  // Future insights data
  customerGrowthRate?: number;
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
  bookingEfficiency,
  noShowRate,
  cancellationRate,
  avgRevenuePerDay,
  customerGrowthRate,
  returningCustomersMonth,
  demandForecast,
  seasonalPatterns
}: IntelligentRecommendationsProps) {
  
  const generateRecommendations = () => {
    const recommendations = [];

    // Customer growth recommendations
    if (customerGrowthRate !== undefined) {
      if (customerGrowthRate > 20) {
        recommendations.push({
          icon: UserPlus,
          title: "Excellent Customer Growth!",
          message: `Your customer growth rate of ${customerGrowthRate.toFixed(1)}% is outstanding! This shows strong market demand. Consider expanding your services or capacity to accommodate more customers.`,
          variant: "purple" as const,
          priority: 1
        });
      } else if (customerGrowthRate > 0) {
        recommendations.push({
          icon: TrendingUp,
          title: "Steady Customer Growth",
          message: `With ${customerGrowthRate.toFixed(1)}% growth, you're on the right track. Focus on customer retention and referral programs to accelerate growth.`,
          variant: "purple" as const,
          priority: 2
        });
      } else if (customerGrowthRate < -10) {
        recommendations.push({
          icon: Lightbulb,
          title: "Customer Acquisition Focus Needed",
          message: `Customer growth is declining by ${Math.abs(customerGrowthRate).toFixed(1)}%. Consider marketing campaigns, social media presence, or customer feedback to understand what's happening.`,
          variant: "purple" as const,
          priority: 1
        });
      }
    }

    // Booking efficiency recommendations
    if (bookingEfficiency !== undefined) {
      if (bookingEfficiency > 85) {
        recommendations.push({
          icon: Target,
          title: "Excellent Booking Efficiency!",
          message: `Your booking efficiency of ${bookingEfficiency.toFixed(1)}% is outstanding! Customers are successfully completing their bookings. Keep up the great work!`,
          variant: "purple" as const,
          priority: 3
        });
      } else if (bookingEfficiency < 60) {
        recommendations.push({
          icon: Target,
          title: "Improve Booking Process",
          message: `Booking efficiency is ${bookingEfficiency.toFixed(1)}%. Consider simplifying your booking process, reducing steps, or improving payment options to increase success rates.`,
          variant: "purple" as const,
          priority: 1
        });
      } else {
        recommendations.push({
          icon: Target,
          title: "Good Booking Efficiency",
          message: `Your booking efficiency of ${bookingEfficiency.toFixed(1)}% is solid. Small improvements to the booking flow could push this even higher.`,
          variant: "purple" as const,
          priority: 2
        });
      }
    }

    // Revenue per day recommendations
    if (avgRevenuePerDay !== undefined) {
      if (avgRevenuePerDay > 200) {
        recommendations.push({
          icon: Zap,
          title: "Strong Daily Revenue!",
          message: `€${avgRevenuePerDay.toFixed(0)} per day shows excellent business performance. Consider premium services or upselling to maximize this trend.`,
          variant: "purple" as const,
          priority: 2
        });
      } else if (avgRevenuePerDay < 50) {
        recommendations.push({
          icon: TrendingUp,
          title: "Revenue Growth Opportunity",
          message: `Daily revenue of €${avgRevenuePerDay.toFixed(0)} has room for improvement. Consider pricing optimization, additional services, or increasing booking frequency.`,
          variant: "purple" as const,
          priority: 1
        });
      }
    }

    // No-show rate recommendations
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

    // Cancellation rate recommendations
    if (cancellationRate !== undefined && cancellationRate > 20) {
      recommendations.push({
        icon: Users,
        title: "Increase Flexibility",
        message: `With ${cancellationRate.toFixed(1)}% cancellations you can use flexibility as a strength. Offer easy rebooking options and analyze the main reasons for cancellations.`,
        variant: "purple" as const,
        priority: 2
      });
    }

    // Returning customers recommendations
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

    // Demand forecast recommendations
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

    // Seasonal recommendations
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
