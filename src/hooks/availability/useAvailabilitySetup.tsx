import { useState, useCallback } from 'react';
import { useAvailabilityManager } from './useAvailabilityManager';
import { useTimezoneManager } from './useTimezoneManager';
import type { SetupStep } from '@/types/availability';

export const useAvailabilitySetup = () => {
  const availabilityManager = useAvailabilityManager();
  const timezoneManager = useTimezoneManager();
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const setupSteps: SetupStep[] = [
    {
      id: 'timezone',
      title: 'Select Timezone',
      description: 'Choose your timezone for accurate scheduling',
      completed: false,
      current: currentStepIndex === 0,
    },
    {
      id: 'schedule',
      title: 'Set Schedule',
      description: 'Configure your weekly availability',
      completed: false,
      current: currentStepIndex === 1,
    },
    {
      id: 'review',
      title: 'Review & Complete',
      description: 'Review your settings and complete setup',
      completed: false,
      current: currentStepIndex === 2,
    },
  ];

  const nextStep = useCallback(() => {
    if (currentStepIndex < setupSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex, setupSteps.length]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const canProceed = useCallback(() => {
    switch (currentStepIndex) {
      case 0: // Timezone step
        return !!timezoneManager.currentTimezone;
      case 1: // Schedule step
        return Object.values(availabilityManager.weeklySchedule).some(day => day.enabled);
      case 2: // Review step
        return true;
      default:
        return false;
    }
  }, [currentStepIndex, timezoneManager.currentTimezone, availabilityManager.weeklySchedule]);

  const completeSetup = useCallback(async () => {
    setIsCompleting(true);

    try {
      // Save the weekly schedule
      const success = await availabilityManager.saveWeeklySchedule();
      
      if (success) {
        // Refresh availability data
        await availabilityManager.fetchAvailability();
        return true;
      }
      
      return false;

    } catch (error) {
      console.error('Error completing setup:', error);
      return false;
    } finally {
      setIsCompleting(false);
    }
  }, [availabilityManager]);

  const isSetupNeeded = useCallback(() => {
    return !availabilityManager.isSetupComplete;
  }, [availabilityManager.isSetupComplete]);

  return {
    currentStepIndex,
    setupSteps: setupSteps.map((step, index) => ({
      ...step,
      completed: index < currentStepIndex,
      current: index === currentStepIndex,
    })),
    nextStep,
    previousStep,
    canProceed: canProceed(),
    completeSetup,
    isCompleting,
    isSetupNeeded: isSetupNeeded(),
    availabilityManager,
    timezoneManager,
  };
};