
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Lightbulb } from 'lucide-react';

interface PerformanceInsightsProps {
  avgResponseTime?: number;
  noShowRate?: number;
  cancellationRate?: number;
  calendarUtilization?: number;
}

export function PerformanceInsights({
  avgResponseTime = 0,
  noShowRate = 0,
  cancellationRate = 0,
  calendarUtilization = 0
}: PerformanceInsightsProps) {
  const getResponseTimeStatus = () => {
    if (avgResponseTime < 15) return { status: 'excellent', icon: CheckCircle, color: 'green' };
    if (avgResponseTime < 60) return { status: 'good', icon: AlertTriangle, color: 'yellow' };
    return { status: 'poor', icon: XCircle, color: 'red' };
  };

  const getUtilizationStatus = () => {
    if (calendarUtilization > 70) return { status: 'excellent', icon: CheckCircle, color: 'green' };
    if (calendarUtilization > 40) return { status: 'good', icon: AlertTriangle, color: 'yellow' };
    return { status: 'poor', icon: XCircle, color: 'red' };
  };

  const responseStatus = getResponseTimeStatus();
  const utilizationStatus = getUtilizationStatus();

  const insights = [
    {
      title: 'Reactietijd Status',
      description: avgResponseTime < 15 
        ? '✅ Uitstekende reactietijd - klanten reageren positief op snelle responses'
        : avgResponseTime < 60
        ? '⚠️ Reactietijd kan beter - probeer binnen 15 minuten te reageren'
        : '❌ Langzame reactietijd - dit kan klanten afschrikken',
      status: responseStatus.status,
      color: responseStatus.color
    },
    {
      title: 'Kalender Efficiency',
      description: calendarUtilization > 70 
        ? '✅ Goede bezettingsgraad - kalender wordt efficiënt benut'
        : calendarUtilization > 40
        ? '⚠️ Gemiddelde bezetting - er is ruimte voor meer boekingen'
        : '❌ Lage bezetting - overweeg marketing of andere tijdslots',
      status: utilizationStatus.status,
      color: utilizationStatus.color
    }
  ];

  const recommendations = [
    {
      condition: avgResponseTime > 30,
      text: 'Stel automatische antwoorden in voor snellere eerste reactie'
    },
    {
      condition: noShowRate > 10,
      text: 'Implementeer herinnerings-SMS\'jes om no-shows te verminderen'
    },
    {
      condition: cancellationRate > 15,
      text: 'Analyseer annuleringsredenen en verbeter het boekingsproces'
    },
    {
      condition: calendarUtilization < 50,
      text: 'Overweeg flexibelere tijdslots of promotiepakketten'
    }
  ].filter(rec => rec.condition);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6"
    >
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`border-${insight.color}-200 bg-${insight.color}-50/50`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 bg-${insight.color}-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                    <responseStatus.icon className={`h-4 w-4 text-${insight.color}-600`} />
                  </div>
                  <div className="space-y-1">
                    <h4 className={`font-medium text-${insight.color}-800`}>{insight.title}</h4>
                    <p className={`text-sm text-${insight.color}-700`}>{insight.description}</p>
                    <Badge 
                      variant={insight.status === 'excellent' ? 'default' : insight.status === 'good' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {insight.status === 'excellent' ? 'Uitstekend' : insight.status === 'good' ? 'Goed' : 'Verbetering Nodig'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Lightbulb className="h-5 w-5" />
              Aanbevelingen voor Verbetering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-blue-100/50 rounded-lg"
                >
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  <p className="text-sm text-blue-700 font-medium">{rec.text}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
