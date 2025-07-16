import React from 'react';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useUserStatus } from '@/contexts/UserStatusContext';
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
      case 'service_types':
        return Bot;
      case 'availability':
        return Clock;
      default:
        return Circle;
    }
  };

  const getStepAction = (step: any) => {
    switch (step.key) {
      case 'business_info':
        return () => navigate('/settings');
      case 'service_types':
        return () => navigate('/settings');
      case 'availability':
        return () => navigate('/availability');
      default:
        return () => navigate('/settings');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-white">Complete Your Setup</h2>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-300">
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
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    isCompleted 
                      ? 'border-primary/30 bg-primary/10' 
                      : isNext 
                        ? 'border-primary/30 bg-primary/10' 
                        : 'border-slate-600 bg-slate-700/50'
                  }`}
                >
                  <div className={`flex-shrink-0 ${
                    isCompleted ? 'text-primary' : isNext ? 'text-primary' : 'text-gray-400'
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
                        isCompleted ? 'text-primary' : isNext ? 'text-primary' : 'text-gray-300'
                      }`}>
                        {step.name}
                      </h4>
                      {isCompleted && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                          Complete
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${
                      isCompleted ? 'text-primary/80' : isNext ? 'text-primary/80' : 'text-gray-400'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  
                  {!isCompleted && (
                    <Button 
                      size="sm" 
                      onClick={getStepAction(step)}
                      className="flex-shrink-0 bg-primary hover:bg-primary/90"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};