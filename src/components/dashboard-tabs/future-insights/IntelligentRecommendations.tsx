
import React from 'react';
import { Clock, Users, Calendar, TrendingUp, AlertTriangle, Target } from 'lucide-react';

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

    // Response time recommendations
    if (avgResponseTime !== undefined) {
      if (avgResponseTime > 15) {
        recommendations.push({
          icon: Clock,
          title: "Reactietijd Verbetering Urgent",
          message: `Je reactietijd van ${avgResponseTime.toFixed(1)} minuten is te hoog. Klanten verwachten binnen 5-10 minuten antwoord. Overweeg automatische begroetingen of snellere notificaties.`,
          variant: "red" as const,
          priority: 1
        });
      } else if (avgResponseTime > 5) {
        recommendations.push({
          icon: Clock,
          title: "Reactietijd Optimalisatie",
          message: `Je reactietijd van ${avgResponseTime.toFixed(1)} minuten kan beter. Streef naar onder de 5 minuten voor optimale klanttevredenheid.`,
          variant: "orange" as const,
          priority: 2
        });
      }
    }

    // No-show rate recommendations
    if (noShowRate !== undefined && noShowRate > 10) {
      recommendations.push({
        icon: AlertTriangle,
        title: "No-show Preventie",
        message: `Je no-show rate van ${noShowRate.toFixed(1)}% is hoog. Verstuur 24u en 2u van tevoren herinneringen. Overweeg een kleine aanbetaling te vragen.`,
        variant: "red" as const,
        priority: 1
      });
    }

    // Cancellation rate recommendations
    if (cancellationRate !== undefined && cancellationRate > 20) {
      recommendations.push({
        icon: Users,
        title: "Annulering Management",
        message: `Je annuleringsrate van ${cancellationRate.toFixed(1)}% is hoog. Analyseer de redenen en overweeg flexibelere herboekingsopties.`,
        variant: "orange" as const,
        priority: 2
      });
    }

    // Calendar utilization recommendations
    if (calendarUtilization !== undefined) {
      if (calendarUtilization > 85) {
        recommendations.push({
          icon: Calendar,
          title: "Capaciteit Uitbreiding Nodig",
          message: `Je kalender is ${calendarUtilization.toFixed(1)}% bezet. Overweeg extra tijdslots, personeel of locaties om de vraag bij te houden.`,
          variant: "blue" as const,
          priority: 1
        });
      } else if (calendarUtilization < 40) {
        recommendations.push({
          icon: Target,
          title: "Marketing Boost Nodig",
          message: `Je kalender is slechts ${calendarUtilization.toFixed(1)}% bezet. Focus op marketing, SEO, of sociale media om meer klanten te trekken.`,
          variant: "orange" as const,
          priority: 2
        });
      }
    }

    // Waitlist recommendations
    if (waitlistSize !== undefined && waitlistSize > 5) {
      recommendations.push({
        icon: Clock,
        title: "Wachtlijst Management",
        message: `Je hebt ${waitlistSize} mensen op de wachtlijst. Overweeg extra tijdslots toe te voegen of prioriteer annuleringen om deze vraag te bedienen.`,
        variant: "blue" as const,
        priority: 1
      });
    }

    // Returning customers recommendations
    if (returningCustomersMonth !== undefined) {
      if (returningCustomersMonth < 3) {
        recommendations.push({
          icon: Users,
          title: "Klantbehoud Verbeteren",
          message: `Slechts ${returningCustomersMonth} terugkerende klanten deze maand. Focus op klanttevredenheid, loyaliteitsprogramma's of follow-up service.`,
          variant: "orange" as const,
          priority: 2
        });
      } else if (returningCustomersMonth > 10) {
        recommendations.push({
          icon: Users,
          title: "Uitstekende Klantbehoud",
          message: `${returningCustomersMonth} terugkerende klanten tonen goede loyaliteit! Vraag om reviews en doorverwijzingen.`,
          variant: "green" as const,
          priority: 3
        });
      }
    }

    // Demand forecast recommendations
    if (demandForecast && demandForecast.length > 0) {
      const avgBookings = demandForecast.reduce((sum, week) => sum + week.bookings, 0) / demandForecast.length;
      const trendUp = demandForecast.filter(week => week.trend_direction === 'up').length;
      const trendDown = demandForecast.filter(week => week.trend_direction === 'down').length;

      if (trendUp > trendDown) {
        recommendations.push({
          icon: TrendingUp,
          title: "Groeiende Vraag Voorspelling",
          message: `Trends tonen groeiende vraag de komende weken. Bereid extra capaciteit voor en overweeg prijsaanpassingen tijdens piekperiodes.`,
          variant: "green" as const,
          priority: 2
        });
      } else if (trendDown > trendUp) {
        recommendations.push({
          icon: TrendingUp,
          title: "Dalende Vraag Alert",
          message: `Trends tonen dalende vraag. Start marketingcampagnes, bied kortingen aan, of introduceer nieuwe services om vraag te stimuleren.`,
          variant: "orange" as const,
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
          title: "Seizoens Piekperiode",
          message: `${currentPattern.month_name} is historisch een drukke maand. Zorg voor voldoende capaciteit en personeel planning.`,
          variant: "blue" as const,
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
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-green-500/30">
          <Target className="h-8 w-8 text-green-400" />
        </div>
        <p className="text-slate-300 font-medium mb-2">Geen specifieke aanbevelingen</p>
        <p className="text-sm text-slate-400">Je performance ziet er goed uit! We houden de metrics in de gaten.</p>
      </div>
    );
  }

  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'red':
        return 'from-red-500/15 via-red-500/10 to-transparent border-red-500/30 text-red-300';
      case 'orange':
        return 'from-orange-500/15 via-orange-500/10 to-transparent border-orange-500/30 text-orange-300';
      case 'green':
        return 'from-green-500/15 via-green-500/10 to-transparent border-green-500/30 text-green-300';
      default:
        return 'from-blue-500/15 via-blue-500/10 to-transparent border-blue-500/30 text-blue-300';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {recommendations.map((rec, index) => (
        <div
          key={index}
          className={`p-6 bg-gradient-to-br ${getVariantStyles(rec.variant)} border rounded-xl backdrop-blur-sm`}
          style={{
            animation: `fadeIn 0.6s ease-out ${index * 0.1}s both`
          }}
        >
          <h4 className={`font-bold mb-3 flex items-center gap-2 ${rec.variant === 'red' ? 'text-red-300' : rec.variant === 'orange' ? 'text-orange-300' : rec.variant === 'green' ? 'text-green-300' : 'text-blue-300'}`}>
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
