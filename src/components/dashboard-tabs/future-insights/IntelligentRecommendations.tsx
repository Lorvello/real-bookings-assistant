
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
          title: "Snellere Reactietijd Kans",
          message: `Je reactietijd is momenteel ${avgResponseTime.toFixed(1)} minuten. Door sneller te reageren (binnen 5-10 minuten) verhoog je klanttevredenheid en conversie. Overweeg automatische begroetingen of pushnotificaties!`,
          variant: "orange" as const,
          priority: 1
        });
      } else if (avgResponseTime > 5) {
        recommendations.push({
          icon: Clock,
          title: "Reactietijd Optimalisatie Tip",
          message: `Met ${avgResponseTime.toFixed(1)} minuten reactietijd doe je het al goed! Om het nog beter te maken: streef naar onder de 5 minuten voor maximale klanttevredenheid.`,
          variant: "blue" as const,
          priority: 2
        });
      } else {
        recommendations.push({
          icon: Zap,
          title: "Uitstekende Reactietijd!",
          message: `Fantastisch! Je reactietijd van ${avgResponseTime.toFixed(1)} minuten is excellent. Klanten waarderen snelle service - dit helpt je conversie aanzienlijk.`,
          variant: "green" as const,
          priority: 3
        });
      }
    }

    // No-show rate recommendations - more encouraging
    if (noShowRate !== undefined && noShowRate > 10) {
      recommendations.push({
        icon: Calendar,
        title: "No-show Preventie Strategie",
        message: `Je no-show rate van ${noShowRate.toFixed(1)}% biedt verbeterkansen. Probeer 24u en 2u van tevoren herinneringen te sturen. Een kleine aanbetaling kan ook helpen om commitment te verhogen.`,
        variant: "blue" as const,
        priority: 1
      });
    } else if (noShowRate !== undefined && noShowRate <= 5) {
      recommendations.push({
        icon: Heart,
        title: "Geweldige Betrouwbaarheid!",
        message: `Je no-show rate van ${noShowRate.toFixed(1)}% is uitstekend! Je klanten zijn betrouwbaar en waarderen je service. Blijf doen wat je doet!`,
        variant: "green" as const,
        priority: 3
      });
    }

    // Cancellation rate recommendations - supportive tone
    if (cancellationRate !== undefined && cancellationRate > 20) {
      recommendations.push({
        icon: Users,
        title: "Flexibiliteit Verhogen",
        message: `Met ${cancellationRate.toFixed(1)}% annuleringen kun je flexibiliteit als sterkte gebruiken. Bied gemakkelijke herboekingsopties aan en analyseer de hoofdredenen voor annuleringen.`,
        variant: "blue" as const,
        priority: 2
      });
    }

    // Calendar utilization recommendations - growth focused
    if (calendarUtilization !== undefined) {
      if (calendarUtilization > 85) {
        recommendations.push({
          icon: TrendingUp,
          title: "Geweldige Vraag - Groei Kans!",
          message: `Je kalender is ${calendarUtilization.toFixed(1)}% bezet - dat is fantastisch! Dit toont sterke vraag. Overweeg uitbreiding: extra tijdslots, personeel of een tweede locatie.`,
          variant: "green" as const,
          priority: 1
        });
      } else if (calendarUtilization < 40) {
        recommendations.push({
          icon: Lightbulb,
          title: "Marketing Groeikansen",
          message: `Je kalender heeft nog ${(100 - calendarUtilization).toFixed(1)}% ruimte voor meer klanten. Perfect moment voor marketing: sociale media, SEO of doorverwijzingscampagnes kunnen je helpen groeien.`,
          variant: "blue" as const,
          priority: 2
        });
      } else {
        recommendations.push({
          icon: Target,
          title: "Gezonde Bezettingsgraad",
          message: `Je kalender is ${calendarUtilization.toFixed(1)}% bezet - een mooie balans! Je hebt ruimte voor groei zonder overbelasting. Perfecte basis voor stabiele groei.`,
          variant: "green" as const,
          priority: 3
        });
      }
    }

    // Waitlist recommendations - opportunity focused
    if (waitlistSize !== undefined && waitlistSize > 5) {
      recommendations.push({
        icon: Clock,
        title: "Wachtlijst = Groei Indicator!",
        message: `${waitlistSize} mensen op je wachtlijst tonen sterke vraag! Overweeg extra tijdslots toe te voegen of prioriteer annuleringen om deze enthousiaste klanten te bedienen.`,
        variant: "green" as const,
        priority: 1
      });
    }

    // Returning customers recommendations - relationship focused
    if (returningCustomersMonth !== undefined) {
      if (returningCustomersMonth < 3) {
        recommendations.push({
          icon: Heart,
          title: "Klantrelaties Versterken",
          message: `Je hebt dit maand ${returningCustomersMonth} terugkerende klanten gehad. Kans om loyaliteit te bouwen: follow-up service, loyaliteitsprogramma's of persoonlijke aandacht kunnen het verschil maken.`,
          variant: "blue" as const,
          priority: 2
        });
      } else if (returningCustomersMonth > 10) {
        recommendations.push({
          icon: Heart,
          title: "Fantastische Klantloyaliteit!",
          message: `${returningCustomersMonth} terugkerende klanten deze maand tonen geweldige loyaliteit! Je doet het uitstekend. Vraag om reviews en doorverwijzingen - tevreden klanten zijn je beste ambassadeurs.`,
          variant: "green" as const,
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
          title: "Groeiende Vraag Voorspeld!",
          message: `Trends tonen groeiende vraag de komende weken. Geweldig nieuws! Bereid extra capaciteit voor en overweeg seasonale pricing tijdens piekperiodes.`,
          variant: "green" as const,
          priority: 2
        });
      } else if (trendDown > trendUp) {
        recommendations.push({
          icon: Lightbulb,
          title: "Marketing Kans Gespot",
          message: `Trends tonen kans voor meer klanten. Perfect moment voor promoties, nieuwe service introductie, of een referral campagne om momentum te creëren.`,
          variant: "blue" as const,
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
          title: "Seizoens Succeskans",
          message: `${currentPattern.month_name} is historisch een sterke maand voor je! Zorg dat je voorbereid bent: voldoende capaciteit en personeel planning maximaliseren je succeskansen.`,
          variant: "green" as const,
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
        <p className="text-slate-300 font-medium mb-2">Alles ziet er geweldig uit!</p>
        <p className="text-sm text-slate-400">Je performance is sterk. We houden de metrics in de gaten voor nieuwe kansen.</p>
      </div>
    );
  }

  const getVariantStyles = (variant: string) => {
    switch (variant) {
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
          <h4 className={`font-bold mb-3 flex items-center gap-2 ${
            rec.variant === 'orange' ? 'text-orange-300' : 
            rec.variant === 'green' ? 'text-green-300' : 
            'text-blue-300'
          }`}>
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
