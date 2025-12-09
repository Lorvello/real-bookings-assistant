import React, { useState, useEffect, useRef } from 'react';
import { AvailabilityDayRow } from './AvailabilityDayRow';
import { useDailyAvailabilityManager } from '@/hooks/useDailyAvailabilityManager';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DailyAvailabilityProps {
  onChange: () => void;
}

export const DailyAvailability: React.FC<DailyAvailabilityProps> = ({ onChange }) => {
  const {
    DAYS,
    availability,
    setAvailability,
    defaultCalendar,
    defaultSchedule,
    syncToDatabase,
    createDefaultSchedule
  } = useDailyAvailabilityManager(onChange);

  const { toast } = useToast();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [changedDays, setChangedDays] = useState<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Track changes after initial load
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
  }, [availability]);

  const markDayChanged = (dayKey: string) => {
    setChangedDays(prev => new Set(prev).add(dayKey));
    setHasUnsavedChanges(true);
  };

  const updateDayEnabled = (dayKey: string, enabled: boolean) => {
    const newAvailability = {
      ...availability,
      [dayKey]: { ...availability[dayKey], enabled }
    };
    setAvailability(newAvailability);
    markDayChanged(dayKey);
  };

  const updateTimeBlock = (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => {
    const currentBlocks = availability[dayKey].timeBlocks;
    const updatedBlocks = currentBlocks.map(block =>
      block.id === blockId ? { ...block, [field]: value } : block
    );

    const hasDuplicates = updatedBlocks.some((block, index) => 
      updatedBlocks.findIndex(b => b.startTime === block.startTime && b.endTime === block.endTime) !== index
    );

    if (hasDuplicates) {
      console.warn(`Duplicate time block detected for ${dayKey}, not updating`);
      return;
    }

    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: updatedBlocks
      }
    };
    
    setAvailability(newAvailability);
    markDayChanged(dayKey);
  };

  const addTimeBlock = (dayKey: string) => {
    const currentBlocks = availability[dayKey].timeBlocks;
    const newBlockId = `${dayKey}-${Date.now()}`; 
    const lastBlock = currentBlocks[currentBlocks.length - 1];
    
    let newStartTime = lastBlock?.endTime || '09:00';
    let newEndTime = '17:00';
    
    if (newStartTime >= '17:00') {
      newStartTime = '08:00';
      newEndTime = '12:00';
    }

    const newTimeBlock = {
      id: newBlockId,
      startTime: newStartTime,
      endTime: newEndTime
    };

    const wouldCreateDuplicate = currentBlocks.some(block => 
      block.startTime === newTimeBlock.startTime && block.endTime === newTimeBlock.endTime
    );

    if (wouldCreateDuplicate) {
      console.warn(`Would create duplicate time block for ${dayKey}, not adding`);
      return;
    }
    
    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: [...currentBlocks, newTimeBlock]
      }
    };
    
    setAvailability(newAvailability);
    markDayChanged(dayKey);
  };

  const removeTimeBlock = (dayKey: string, blockId: string) => {
    if (availability[dayKey].timeBlocks.length <= 1) {
      console.log('Cannot remove the last time block');
      return;
    }
    
    const newAvailability = {
      ...availability,
      [dayKey]: {
        ...availability[dayKey],
        timeBlocks: availability[dayKey].timeBlocks.filter(block => block.id !== blockId)
      }
    };
    
    setAvailability(newAvailability);
    markDayChanged(dayKey);
  };

  const copyDayToNext = (dayKey: string) => {
    const dayIndex = DAYS.findIndex(d => d.key === dayKey);
    if (dayIndex === -1 || dayIndex >= DAYS.length - 1) return;
    
    const nextDay = DAYS[dayIndex + 1];
    const currentDayData = availability[dayKey];
    
    const copiedBlocks = currentDayData.timeBlocks.map(block => ({
      ...block,
      id: `${nextDay.key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    const newAvailability = {
      ...availability,
      [nextDay.key]: {
        enabled: currentDayData.enabled,
        timeBlocks: copiedBlocks
      }
    };
    
    setAvailability(newAvailability);
    markDayChanged(nextDay.key);
  };

  const handleSave = async () => {
    if (!hasUnsavedChanges || changedDays.size === 0) return;
    
    setIsSaving(true);
    try {
      // Save all changed days
      for (const dayKey of changedDays) {
        await syncToDatabase(dayKey, availability[dayKey]);
      }
      
      setHasUnsavedChanges(false);
      setChangedDays(new Set());
      
      toast({
        title: "Saved",
        description: "Your availability has been updated.",
      });
      
      onChange();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        title: "Error",
        description: "Failed to save availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDropdown = (dropdownId: string) => {
    setOpenDropdowns(prev => {
      const newState: Record<string, boolean> = {};
      Object.keys(prev).forEach(key => {
        newState[key] = false;
      });
      newState[dropdownId] = !prev[dropdownId];
      return newState;
    });
  };

  const closeDropdown = (dropdownId: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdownId]: false
    }));
  };

  // Auto-create schedule if calendar exists but no schedule
  useEffect(() => {
    const initSchedule = async () => {
      if (defaultCalendar && !defaultSchedule) {
        try {
          await createDefaultSchedule();
        } catch (error) {
          console.error('Failed to auto-create schedule:', error);
        }
      }
    };
    initSchedule();
  }, [defaultCalendar?.id, defaultSchedule?.id]);

  if (!defaultCalendar) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!defaultSchedule) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-border/30">
        {DAYS.map((day) => {
          const dayAvailability = availability[day.key];
          const dayKey = day.key;
          const hasPendingUpdates = changedDays.has(dayKey);
          
          return (
            <AvailabilityDayRow
              key={day.key}
              day={day}
              dayAvailability={dayAvailability}
              openDropdowns={openDropdowns}
              hasPendingUpdates={hasPendingUpdates}
              hasSyncingRules={false}
              onUpdateDayEnabled={updateDayEnabled}
              onUpdateTimeBlock={updateTimeBlock}
              onAddTimeBlock={addTimeBlock}
              onRemoveTimeBlock={removeTimeBlock}
              onCopyDay={copyDayToNext}
              onToggleDropdown={toggleDropdown}
              onCloseDropdown={closeDropdown}
            />
          );
        })}
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-border/30">
        <Button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
};
