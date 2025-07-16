import React from 'react';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useUserStatus } from '@/hooks/useUserStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, ArrowRight, Settings, Calendar, Clock, MessageCircle, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OnboardingWizard = () => {
  const { completionPercentage, completedSteps, totalSteps, nextSteps, allSteps } = useOnboardingProgress();
  const { userStatus } = useUserStatus();
  const navigate = useNavigate();

  if (!userStatus.isSetupIncomplete) {
    return null;
  }

  const getStepIcon = (step: any) => {
    switch (step.key) {
      case 'business_info':
        return Settings;
      case 'calendar_setup':
        return Calendar;
      case 'service_types':
        return Bot;
      case 'availability':
        return Clock;
      case 'booking_settings':
        return MessageCircle;
      default:
        return Circle;
    }
  };

  const getStepAction = (step: any) => {
    switch (step.key) {
      case 'business_info':
        return () => navigate('/settings');
      case 'calendar_setup':
        return () => navigate('/settings');
      case 'service_types':
        return () => navigate('/settings');
      case 'availability':
        return () => navigate('/availability');
      case 'booking_settings':
        return () => navigate('/settings');
      default:
        return () => navigate('/settings');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Complete Your Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completedSteps}/{totalSteps} completed</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
          
          <div className="space-y-3">
            {allSteps.map((step) => {
              const StepIcon = getStepIcon(step);
              const isCompleted = step.completed;
              const isNext = nextSteps.includes(step);
              
              return (
                <div 
                  key={step.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isCompleted 
                      ? 'border-green-200 bg-green-50' 
                      : isNext 
                        ? 'border-blue-200 bg-blue-50' 
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className={`flex-shrink-0 ${
                    isCompleted ? 'text-green-600' : isNext ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium ${
                        isCompleted ? 'text-green-800' : isNext ? 'text-blue-800' : 'text-gray-600'
                      }`}>
                        {step.name}
                      </h4>
                      {isCompleted && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Complete
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${
                      isCompleted ? 'text-green-600' : isNext ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  
                  {!isCompleted && (
                    <Button 
                      size="sm" 
                      onClick={getStepAction(step)}
                      className="flex-shrink-0"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};