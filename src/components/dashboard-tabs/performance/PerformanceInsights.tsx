
import React from 'react';
import { Clock, AlertTriangle, Calendar, TrendingUp, Target, Users } from 'lucide-react';

interface PerformanceInsightsProps {
  avgResponseTime?: number;
  noShowRate?: number;
  cancellationRate?: number;
  calendarUtilization?: number;
}

export function PerformanceInsights({ 
  avgResponseTime, 
  noShowRate, 
  cancellationRate, 
  calendarUtilization 
}: PerformanceInsightsProps) {
  const getResponseTimeInsight = () => {
    if (!avgResponseTime) return "Nog geen reactietijd data beschikbaar.";
    if (avgResponseTime < 5) return "Uitstekende reactietijd! Klanten krijgen snel antwoord.";
    if (avgResponseTime < 15) return "Goede reactietijd, maar er is ruimte voor verbetering.";
    return "Reactietijd kan verbeterd worden voor betere klanttevredenheid.";
  };

  const getNoShowInsight = () => {
    if (noShowRate === undefined) return "Nog geen no-show data beschikbaar.";
    if (noShowRate < 5) return "Lage no-show rate toont goede klantbetrokkenheid.";
    if (noShowRate < 15) return "Gemiddelde no-show rate, overweeg herinneringen te versturen.";
    return "Hoge no-show rate - versterk je reminder systeem.";
  };

  const getCancellationInsight = () => {
    if (cancellationRate === undefined) return "Nog geen annulering data beschikbaar.";
    if (cancellationRate < 10) return "Lage annuleringsrate toont tevreden klanten.";
    if (cancellationRate < 25) return "Gemiddelde annuleringsrate, monitor trends.";
    return "Hoge annuleringsrate - analyseer mogelijke oorzaken.";
  };

  const getUtilizationInsight = () => {
    if (calendarUtilization === undefined) return "Nog geen bezettingsdata beschikbaar.";
    if (calendarUtilization > 80) return "Hoge kalender bezetting - overweeg extra capaciteit.";
    if (calendarUtilization > 60) return "Goede kalender bezetting met ruimte voor groei.";
    return "Kalender bezetting kan verbeterd worden met marketing.";
  };

  const insights = [
    {
      title: "Reactietijd Optimalisatie",
      insight: getResponseTimeInsight(),
      icon: Clock,
      variant: "blue" as const
    },
    {
      title: "No-show Preventie",
      insight: getNoShowInsight(),
      icon: AlertTriangle,
      variant: "blue" as const
    },
    {
      title: "Annulering Management",
      insight: getCancellationInsight(),
      icon: Users,
      variant: "blue" as const
    },
    {
      title: "Capaciteit Optimalisatie",
      insight: getUtilizationInsight(),
      icon: Target,
      variant: "green" as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {insights.map((item, index) => (
        <div
          key={item.title}
          className={`p-6 bg-gradient-to-br ${
            item.variant === 'green' 
              ? 'from-green-500/10 via-green-500/5 to-transparent border-green-500/20' 
              : 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20'
          } border rounded-xl backdrop-blur-sm`}
          style={{
            animation: `fadeIn 0.6s ease-out ${index * 0.1}s both`
          }}
        >
          <h4 className={`font-bold mb-3 flex items-center gap-2 ${
            item.variant === 'green' ? 'text-green-300' : 'text-blue-300'
          }`}>
            <item.icon className="h-5 w-5" />
            {item.title}
          </h4>
          <p className="text-slate-300 text-sm leading-relaxed">
            {item.insight}
          </p>
        </div>
      ))}
    </div>
  );
}
