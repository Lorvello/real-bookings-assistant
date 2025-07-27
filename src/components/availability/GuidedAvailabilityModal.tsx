import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, ArrowLeft, ArrowRight, Calendar, Globe, Loader2 } from 'lucide-react';
import { ProfessionalTimePicker } from './ProfessionalTimePicker';
import { useDailyAvailabilityManager } from '@/hooks/useDailyAvailabilityManager';
import { COMPREHENSIVE_TIMEZONES } from './TimezoneData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GuidedAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  startDay?: number | null;
  editMode?: boolean;
  selectedCalendar?: { id: string; timezone: string };
}

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  enabled: boolean;
  timeBlocks: TimeBlock[];
}


export const GuidedAvailabilityModal: React.FC<GuidedAvailabilityModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  startDay = null,
  editMode = false,
  selectedCalendar
}) => {
  // Get DAYS first from the hook
  const { DAYS, syncToDatabase, createDefaultSchedule, defaultSchedule, availability: existingAvailability, setAvailability } = useDailyAvailabilityManager(() => {});
  
  const [currentStep, setCurrentStep] = useState(startDay ?? 0);
  const [timezone, setTimezone] = useState(selectedCalendar?.timezone || 'Europe/Amsterdam');
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<{dayKey: string; blockId: string; field: 'startTime' | 'endTime'} | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [localAvailability, setLocalAvailability] = useState<Record<string, DayAvailability>>(() => {
    const initial: Record<string, DayAvailability> = {};
    DAYS.forEach(day => {
      initial[day.key] = {
        enabled: !day.isWeekend,
        timeBlocks: [{
          id: `${day.key}-1`,
          startTime: '08:00',
          endTime: '19:00'
        }]
      };
    });
    return initial;
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load existing availability data when in edit mode
  useEffect(() => {
    if (editMode && existingAvailability && Object.keys(existingAvailability).length > 0) {
      console.log('Loading existing availability data for edit mode');
      setLocalAvailability(existingAvailability);
    }
  }, [editMode, existingAvailability]);

  // Load existing timezone when selectedCalendar changes
  useEffect(() => {
    if (selectedCalendar?.timezone) {
      setTimezone(selectedCalendar.timezone);
    }
  }, [selectedCalendar]);

  const totalSteps = DAYS.length + 1; // Days + timezone step
  const progress = (currentStep / totalSteps) * 100;

  const isCurrentDayComplete = () => {
    if (currentStep >= DAYS.length) return true;
    const currentDay = DAYS[currentStep];
    const dayData = localAvailability[currentDay.key];
    
    if (!dayData.enabled) return true;
    
    return dayData.timeBlocks.every(block => 
      block.startTime && block.endTime && block.startTime < block.endTime
    );
  };

  const handleDayToggle = (dayKey: string, enabled: boolean) => {
    setLocalAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        enabled
      }
    }));
  };

  const handleTimeBlockUpdate = (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => {
    setLocalAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: prev[dayKey].timeBlocks.map(block =>
          block.id === blockId ? { ...block, [field]: value } : block
        )
      }
    }));
  };

  const addTimeBlock = (dayKey: string) => {
    const newBlockId = `${dayKey}-${Date.now()}`;
    setLocalAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: [
          ...prev[dayKey].timeBlocks,
          {
            id: newBlockId,
            startTime: '09:00',
            endTime: '17:00'
          }
        ]
      }
    }));
  };

  const removeTimeBlock = (dayKey: string, blockId: string) => {
    setLocalAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: prev[dayKey].timeBlocks.filter(block => block.id !== blockId)
      }
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const saveTimezone = async () => {
    if (!selectedCalendar?.id) {
      throw new Error('No calendar selected');
    }

    const { error } = await supabase
      .from('calendars')
      .update({ timezone })
      .eq('id', selectedCalendar.id);

    if (error) {
      throw error;
    }
  };

  const handleComplete = async () => {
    if (!selectedCalendar) {
      toast({
        title: "Setup Error",
        description: "No calendar selected. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsCompleting(true);
    
    try {
      console.log('🚀 Starting availability configuration save...');
      
      // SIMPLIFIED: Single batch operation to save everything
      const savePromises = [];
      
      // Ensure default schedule exists
      console.log('📋 Ensuring default schedule exists...');
      const schedule = await createDefaultSchedule();
      
      if (!schedule?.id && !defaultSchedule?.id) {
        throw new Error('Failed to create or find default schedule');
      }
      
      // Batch save all availability rules
      console.log(`📝 Saving availability for all days...`);
      const validDays = DAYS.filter(day => localAvailability[day.key]);
      
      for (const day of validDays) {
        const dayData = localAvailability[day.key];
        savePromises.push(syncToDatabase(day.key, dayData, schedule));
      }
      
      // Save timezone if changed
      if (timezone && timezone !== selectedCalendar.timezone) {
        savePromises.push(saveTimezone());
      }
      
      // Execute all saves in parallel
      await Promise.all(savePromises);
      console.log('✅ All data saved successfully');
      
      toast({
        title: "Configuration Saved",
        description: "Your availability and timezone have been saved successfully.",
      });
      onComplete();
      
    } catch (error) {
      console.error('❌ Error saving availability configuration:', error);
      
      let errorMessage = error.message || "There was an error saving your configuration.";
      
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Don't call onComplete on error - let user retry
    } finally {
      setIsCompleting(false);
    }
  };

  const renderDayConfiguration = () => {
    if (currentStep >= DAYS.length) return null;
    
    const currentDay = DAYS[currentStep];
    const dayData = localAvailability[currentDay.key];

    return (
      <div className="space-y-6">
        {/* Day Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-2xl font-bold text-foreground">{currentDay.label}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure your availability for {currentDay.label.toLowerCase()}
          </p>
        </div>

        {/* Day Toggle */}
        <div className="flex items-center justify-center space-x-4 p-4 bg-muted/30 rounded-2xl">
          <span className="text-sm font-medium text-foreground">
            {dayData.enabled ? 'Available' : 'Unavailable'}
          </span>
          <Switch
            checked={dayData.enabled}
            onCheckedChange={(enabled) => handleDayToggle(currentDay.key, enabled)}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        {/* Time Blocks */}
        {dayData.enabled && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Working Hours</h4>
              {dayData.timeBlocks.length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTimeBlock(currentDay.key)}
                  className="text-primary border-primary/20 hover:bg-primary/10"
                >
                  Add Time Block
                </Button>
              )}
            </div>

            {dayData.timeBlocks.map((block, index) => (
              <div key={block.id} className="bg-card/50 border border-border/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Time Block {index + 1}
                  </span>
                  {dayData.timeBlocks.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTimeBlock(currentDay.key, block.id)}
                      className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                    <ProfessionalTimePicker
                      value={block.startTime}
                      onChange={(value) => handleTimeBlockUpdate(currentDay.key, block.id, 'startTime', value)}
                      isOpen={selectedTimeBlock?.dayKey === currentDay.key && selectedTimeBlock?.blockId === block.id && selectedTimeBlock?.field === 'startTime'}
                      onToggle={() => setSelectedTimeBlock(
                        selectedTimeBlock?.dayKey === currentDay.key && selectedTimeBlock?.blockId === block.id && selectedTimeBlock?.field === 'startTime' 
                          ? null 
                          : {dayKey: currentDay.key, blockId: block.id, field: 'startTime'}
                      )}
                      onClose={() => setSelectedTimeBlock(null)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">End Time</label>
                    <ProfessionalTimePicker
                      value={block.endTime}
                      onChange={(value) => handleTimeBlockUpdate(currentDay.key, block.id, 'endTime', value)}
                      isOpen={selectedTimeBlock?.dayKey === currentDay.key && selectedTimeBlock?.blockId === block.id && selectedTimeBlock?.field === 'endTime'}
                      onToggle={() => setSelectedTimeBlock(
                        selectedTimeBlock?.dayKey === currentDay.key && selectedTimeBlock?.blockId === block.id && selectedTimeBlock?.field === 'endTime' 
                          ? null 
                          : {dayKey: currentDay.key, blockId: block.id, field: 'endTime'}
                      )}
                      onClose={() => setSelectedTimeBlock(null)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTimezoneSelection = () => {
    if (currentStep !== DAYS.length) return null;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="text-2xl font-bold text-foreground">Select Timezone</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose your timezone for accurate scheduling
          </p>
        </div>

        <div className="space-y-4">
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full bg-background border-border hover:border-primary/40 transition-colors rounded-xl h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border rounded-xl max-h-80 overflow-y-auto">
              {COMPREHENSIVE_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-xl bg-background border-border/50 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-center text-xl font-bold text-foreground">
            {editMode ? 'Edit Your Availability' : 'Configure Your Availability'}
          </DialogTitle>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center space-x-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < currentStep 
                    ? 'bg-primary' 
                    : i === currentStep 
                      ? 'bg-primary/50' 
                      : 'bg-border'
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="py-6">
          {renderDayConfiguration()}
          {renderTimezoneSelection()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border/40">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <div className="flex items-center space-x-2">
            {currentStep < DAYS.length - 1 && (
              <Button
                onClick={handleNext}
                disabled={!isCurrentDayComplete()}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
              >
                <span>Next Day</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {currentStep === DAYS.length - 1 && (
              <Button
                onClick={handleNext}
                disabled={!isCurrentDayComplete()}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
              >
                <span>Select Timezone</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {currentStep === DAYS.length && (
              <Button
                onClick={handleComplete}
                disabled={isCompleting}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving configuration...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Complete Setup</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};