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

// PHASE 1: Remove auto-save system - implement single save on close only

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { syncToDatabase } = useDailyAvailabilityManager(() => {});
  
  // Get current day info
  const currentDay = DAYS[dayIndex];

  // PHASE 1: Remove auto-save - buffer all changes locally until explicit save
  useEffect(() => {
    if (isOpen) {
      setLocalDayData(initialDayData);
      setHasUnsavedChanges(false);
      setError(null);
    }
  }, [isOpen, initialDayData]);

  // Track changes to show unsaved indicator
  useEffect(() => {
    if (isOpen && JSON.stringify(localDayData) !== JSON.stringify(initialDayData)) {
      setHasUnsavedChanges(true);
    }
  }, [localDayData, initialDayData, isOpen]);

  const handleDayToggle = useCallback((enabled: boolean) => {
    setLocalDayData(prev => ({
      ...prev,
      enabled
    }));
  }, []);

  const handleTimeBlockUpdate = useCallback((blockId: string, field: 'startTime' | 'endTime', value: string) => {
    // PHASE 1: Buffer changes locally only - no immediate save
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

  // Separate save and close actions for immediate feedback
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    setError(null);

    try {
      console.log(`Saving changes for ${currentDay.key}:`, localDayData);
      await syncToDatabase(currentDay.key, localDayData);
      setHasUnsavedChanges(false);
      // Immediately refresh the parent component
      onComplete();
      setIsSaving(false);
    } catch (error) {
      console.error('Save failed:', error);
      setError('Failed to save changes. Please try again.');
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, localDayData, currentDay.key, syncToDatabase, onComplete]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

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
          
          {/* Save status indicator */}
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            {isSaving ? (
              <>
                <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span>Unsaved changes</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>All changes saved</span>
              </>
            )}
          </div>
          
          {/* Error message */}
          {error && (
            <div className="text-center text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
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
        <div className="flex items-center justify-between pt-4 border-t border-border/40">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSaving}
            className="text-muted-foreground hover:text-foreground"
          >
            Close
          </Button>
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
            {!hasUnsavedChanges && !isSaving && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Saved</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};