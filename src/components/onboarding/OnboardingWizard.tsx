import React, { useState } from 'react';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, ArrowRight, Settings, Calendar, Clock, MessageCircle, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';

export const OnboardingWizard = () => {
  const { completionPercentage, completedSteps, totalSteps, nextSteps, allSteps } = useOnboardingProgress();
  const { userStatus } = useUserStatus();
  const navigate = useNavigate();
  const [showCreateCalendarDialog, setShowCreateCalendarDialog] = useState(false);

  // Hide setup section when all steps are completed
  if (!userStatus.isSetupIncomplete || completionPercentage === 100) {
    return null;
  }

  const getStepIcon = (step: any) => {
    switch (step.key) {
      case 'business_info':
        return Settings;
      case 'service_types':
        return Bot;
      case 'calendar_creation':
        return Calendar;
      case 'availability':
        return Clock;
      default:
        return Circle;
    }
  };

  const getStepAction = (step: any) => {
    switch (step.key) {
      case 'business_info':
        return () => navigate('/settings?tab=knowledge');
      case 'service_types':
        return () => navigate('/settings?tab=services');
      case 'calendar_creation':
        return () => setShowCreateCalendarDialog(true);
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
            <Progress value={completionPercentage} className="h-2 bg-slate-700" />
          </div>
          
          <div className="space-y-3">
            {allSteps.map((step) => {
              const StepIcon = getStepIcon(step);
              const isCompleted = step.completed;
              
              return (
                <div 
                  key={step.key}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    isCompleted 
                      ? 'border-green-500/30 bg-green-500/10' 
                      : 'border-slate-600 bg-slate-700/50'
                  }`}
                >
                  <div className={`flex-shrink-0 ${
                    isCompleted ? 'text-green-500' : 'text-gray-400'
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
                        isCompleted ? 'text-green-500' : 'text-gray-300'
                      }`}>
                        {step.name}
                      </h4>
                      {isCompleted && (
                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full">
                          Complete
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${
                      isCompleted ? 'text-green-500/80' : 'text-gray-400'
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
      
      {/* Create Calendar Dialog */}
      <CreateCalendarDialog 
        open={showCreateCalendarDialog}
        onOpenChange={setShowCreateCalendarDialog}
        onCalendarCreated={() => {
          // Dialog will close automatically and calendar creation will trigger progress update
        }}
      />
    </div>
  );
};