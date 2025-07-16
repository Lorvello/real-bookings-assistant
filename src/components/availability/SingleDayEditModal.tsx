import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Plus, Trash2, Save } from 'lucide-react';
import { ProfessionalTimePicker } from './ProfessionalTimePicker';
import { useDailyAvailabilityManager } from '@/hooks/useDailyAvailabilityManager';

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  enabled: boolean;
  timeBlocks: TimeBlock[];
}

interface SingleDayEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  dayIndex: number;
  dayData: DayAvailability;
  dayLabel: string;
}

// Custom hook for debounced auto-save
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const DAYS = [
  { key: 'monday', label: 'Monday', isWeekend: false, dayOfWeek: 1 },
  { key: 'tuesday', label: 'Tuesday', isWeekend: false, dayOfWeek: 2 },
  { key: 'wednesday', label: 'Wednesday', isWeekend: false, dayOfWeek: 3 },
  { key: 'thursday', label: 'Thursday', isWeekend: false, dayOfWeek: 4 },
  { key: 'friday', label: 'Friday', isWeekend: false, dayOfWeek: 5 },
  { key: 'saturday', label: 'Saturday', isWeekend: true, dayOfWeek: 6 },
  { key: 'sunday', label: 'Sunday', isWeekend: true, dayOfWeek: 7 }
];

export const SingleDayEditModal: React.FC<SingleDayEditModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  dayIndex,
  dayData: initialDayData,
  dayLabel
}) => {
  const [localDayData, setLocalDayData] = useState<DayAvailability>(initialDayData);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<{blockId: string; field: 'startTime' | 'endTime'} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { syncToDatabase } = useDailyAvailabilityManager(() => {});
  
  // Get current day info
  const currentDay = DAYS[dayIndex];
  
  // Debounce the local data to trigger auto-save
  const debouncedData = useDebounce(localDayData, 800);

  // Auto-save effect
  useEffect(() => {
    // Don't auto-save on initial load
    if (!isOpen || JSON.stringify(debouncedData) === JSON.stringify(initialDayData)) {
      return;
    }

    const autoSave = async () => {
      setIsSaving(true);
      try {
        await syncToDatabase(currentDay.key, debouncedData);
        setLastSaved(new Date());
        // Don't call onComplete here - it causes modal to close
        // onComplete should only be called when user explicitly closes modal
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    };

    autoSave();
  }, [debouncedData, currentDay.key, syncToDatabase, isOpen, initialDayData]);

  // Reset local data when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setLocalDayData(initialDayData);
    }
  }, [isOpen, initialDayData]);

  const handleDayToggle = useCallback((enabled: boolean) => {
    setLocalDayData(prev => ({
      ...prev,
      enabled
    }));
  }, []);

  const handleTimeBlockUpdate = useCallback((blockId: string, field: 'startTime' | 'endTime', value: string) => {
    setLocalDayData(prev => ({
      ...prev,
      timeBlocks: prev.timeBlocks.map(block =>
        block.id === blockId ? { ...block, [field]: value } : block
      )
    }));
  }, []);

  const addTimeBlock = useCallback(() => {
    const newBlockId = `${currentDay.key}-${Date.now()}`;
    setLocalDayData(prev => ({
      ...prev,
      timeBlocks: [
        ...prev.timeBlocks,
        {
          id: newBlockId,
          startTime: '09:00',
          endTime: '17:00'
        }
      ]
    }));
  }, [currentDay.key]);

  const removeTimeBlock = useCallback((blockId: string) => {
    setLocalDayData(prev => ({
      ...prev,
      timeBlocks: prev.timeBlocks.filter(block => block.id !== blockId)
    }));
  }, []);

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    return `Saved at ${lastSaved.toLocaleTimeString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-lg bg-background border-border/50 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center justify-center space-x-2 text-xl font-bold text-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Edit {dayLabel}</span>
          </DialogTitle>
          
          {/* Auto-save indicator */}
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            {isSaving ? (
              <>
                <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>{formatLastSaved()}</span>
              </>
            ) : (
              <span>Changes will be saved automatically</span>
            )}
          </div>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Day Toggle */}
          <div className="flex items-center justify-center space-x-4 p-4 bg-muted/30 rounded-2xl">
            <span className="text-sm font-medium text-foreground">
              {localDayData.enabled ? 'Available' : 'Unavailable'}
            </span>
            <Switch
              checked={localDayData.enabled}
              onCheckedChange={handleDayToggle}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Time Blocks */}
          {localDayData.enabled && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Working Hours</h4>
                {localDayData.timeBlocks.length < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTimeBlock}
                    className="text-primary border-primary/20 hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Block
                  </Button>
                )}
              </div>

              {localDayData.timeBlocks.map((block, index) => (
                <div key={block.id} className="bg-card/50 border border-border/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Time Block {index + 1}
                    </span>
                    {localDayData.timeBlocks.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeBlock(block.id)}
                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                      <ProfessionalTimePicker
                        value={block.startTime}
                        onChange={(value) => handleTimeBlockUpdate(block.id, 'startTime', value)}
                        isOpen={selectedTimeBlock?.blockId === block.id && selectedTimeBlock?.field === 'startTime'}
                        onToggle={() => setSelectedTimeBlock(
                          selectedTimeBlock?.blockId === block.id && selectedTimeBlock?.field === 'startTime' 
                            ? null 
                            : {blockId: block.id, field: 'startTime'}
                        )}
                        onClose={() => setSelectedTimeBlock(null)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">End Time</label>
                      <ProfessionalTimePicker
                        value={block.endTime}
                        onChange={(value) => handleTimeBlockUpdate(block.id, 'endTime', value)}
                        isOpen={selectedTimeBlock?.blockId === block.id && selectedTimeBlock?.field === 'endTime'}
                        onToggle={() => setSelectedTimeBlock(
                          selectedTimeBlock?.blockId === block.id && selectedTimeBlock?.field === 'endTime' 
                            ? null 
                            : {blockId: block.id, field: 'endTime'}
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

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-border/40">
          <Button
            variant="outline"
            onClick={() => {
              onComplete(); // Trigger parent refresh when explicitly closing
              onClose();
            }}
            className="bg-background hover:bg-muted"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};