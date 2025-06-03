
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Calendar, Zap } from 'lucide-react';
import { useSetupProgress } from '@/hooks/useSetupProgress';
import { useAuth } from '@/hooks/useAuth';

export const SetupProgressCard = () => {
  const { user } = useAuth();
  const { progress, loading, refreshProgress } = useSetupProgress(user);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-green-600" />
            Setup Voortgang
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-sm text-gray-600">Voortgang laden...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate completion percentage
  const totalSteps = 2; // Simplified: cal_user_created + calendar_linked
  const completedSteps = [
    progress?.cal_user_created,
    progress?.calendar_linked
  ].filter(Boolean).length;
  
  const completionPercentage = Math.round((completedSteps / totalSteps) * 100);
  const isComplete = completionPercentage === 100;

  const steps = [
    {
      id: 'cal_user',
      title: 'Cal.com Account',
      description: 'Cal.com user automatisch aangemaakt',
      completed: progress?.cal_user_created || false,
      icon: Calendar,
      automated: true
    },
    {
      id: 'calendar_linked',
      title: 'Kalender Gekoppeld',
      description: 'Cal.com kalender succesvol verbonden',
      completed: progress?.calendar_linked || false,
      icon: CheckCircle,
      automated: true
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-green-600" />
          Setup Voortgang
          {isComplete && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Voltooid
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Voortgang</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${
                  step.completed 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    {step.completed && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {step.automated && (
                      <Badge variant="outline" size="sm" className="text-xs">
                        Automatisch
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Success Message */}
        {isComplete && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <div>
                <h4 className="font-medium">Setup Voltooid! 🎉</h4>
                <p className="text-sm">
                  Je Cal.com account is volledig geconfigureerd en klaar voor 24/7 automatische boekingen via WhatsApp.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshProgress}
          className="w-full"
        >
          <Clock className="h-4 w-4 mr-2" />
          Status Vernieuwen
        </Button>
      </CardContent>
    </Card>
  );
};
