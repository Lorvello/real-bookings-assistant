import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, Plus, Trash2, Calendar as CalendarIcon, Clock, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ProfessionalTimePicker } from './ProfessionalTimePicker';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAvailabilityOverrides } from '@/hooks/useAvailabilityOverrides';
import type { AvailabilityOverride } from '@/types/database';

interface DateOverridesProps {
  onChange?: () => void;
}

export const DateOverrides: React.FC<DateOverridesProps> = ({ onChange }) => {
  const { selectedCalendar } = useCalendarContext();
  const { overrides, createOverride, deleteOverride, loading } = useAvailabilityOverrides(selectedCalendar?.id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<{field: 'startTime' | 'endTime'} | null>(null);
  const [newOverride, setNewOverride] = useState({
    is_available: false,
    start_time: '09:00',
    end_time: '17:00',
    reason: ''
  });

  const addOverride = async () => {
    if (!selectedDate || !selectedCalendar?.id) return;

    try {
      await createOverride({
        calendar_id: selectedCalendar.id,
        date: selectedDate.toISOString().split('T')[0],
        is_available: newOverride.is_available,
        start_time: newOverride.is_available ? newOverride.start_time : null,
        end_time: newOverride.is_available ? newOverride.end_time : null,
        reason: newOverride.reason || null
      });
      
      resetForm();
      onChange?.();
    } catch (error) {
      console.error('Error adding override:', error);
    }
  };

  const resetForm = () => {
    setSelectedDate(undefined);
    setNewOverride({
      is_available: false,
      start_time: '09:00',
      end_time: '17:00',
      reason: ''
    });
    setShowAddForm(false);
  };

  const removeOverride = async (id: string) => {
    try {
      await deleteOverride(id);
      onChange?.();
    } catch (error) {
      console.error('Error removing override:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  if (!selectedCalendar) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please select a calendar to manage date overrides.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-primary/20 rounded-2xl">
          <Info className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Schedule exceptions</h2>
          <p className="text-sm text-muted-foreground">
            Add dates when your availability differs from your standard working hours.
          </p>
        </div>
      </div>

      {/* Add New Override Form */}
      {showAddForm && (
        <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-6 shadow-lg shadow-black/5">
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-2xl">
                <CalendarIcon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">New Exception</h3>
            </div>

            {/* Date Picker */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Date</label>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background/80 border-border/60 rounded-2xl hover:border-primary/40 transition-colors h-12",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "LLL dd, y") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border rounded-2xl" align="start">
                  <Calendar
                    initialFocus
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    numberOfMonths={1}
                    className="rounded-2xl bg-card pointer-events-auto p-4"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Availability Toggle */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Available on this day</label>
              <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-2xl">
                <span className="text-sm font-medium text-foreground">
                  {newOverride.is_available ? 'Available' : 'Not available'}
                </span>
                <Switch
                  checked={newOverride.is_available}
                  onCheckedChange={(is_available) => setNewOverride(prev => ({ ...prev, is_available }))}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

            {/* Time Selection */}
            {newOverride.is_available && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">Working Hours</h4>
                <div className="bg-card/50 border border-border/40 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                      <ProfessionalTimePicker
                        value={newOverride.start_time}
                        onChange={(value) => setNewOverride(prev => ({ ...prev, start_time: value }))}
                        isOpen={selectedTimeBlock?.field === 'startTime'}
                        onToggle={() => setSelectedTimeBlock(
                          selectedTimeBlock?.field === 'startTime' ? null : { field: 'startTime' }
                        )}
                        onClose={() => setSelectedTimeBlock(null)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">End Time</label>
                      <ProfessionalTimePicker
                        value={newOverride.end_time}
                        onChange={(value) => setNewOverride(prev => ({ ...prev, end_time: value }))}
                        isOpen={selectedTimeBlock?.field === 'endTime'}
                        onToggle={() => setSelectedTimeBlock(
                          selectedTimeBlock?.field === 'endTime' ? null : { field: 'endTime' }
                        )}
                        onClose={() => setSelectedTimeBlock(null)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Reason (optional)</label>
              <Textarea
                placeholder="E.g. vacation, holiday, special hours..."
                value={newOverride.reason}
                onChange={(e) => setNewOverride(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-background/80 border-border/60 rounded-2xl focus:border-primary/40 resize-none"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={resetForm}
                className="bg-background/80 border-border/60 hover:bg-muted/50 rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                onClick={addOverride}
                disabled={!selectedDate}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl"
              >
                Add Exception
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Overrides */}
      {loading ? (
        <div className="text-center py-4">
          <div className="text-sm text-muted-foreground">Loading overrides...</div>
        </div>
      ) : overrides.length > 0 ? (
        <div className="space-y-4">
          {overrides.map((override) => (
            <div key={override.id} className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-6 shadow-lg shadow-black/5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-primary/20 rounded-2xl">
                      <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{formatDate(override.date)}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant={override.is_available ? "default" : "secondary"}
                          className={cn(
                            "rounded-full",
                            override.is_available 
                              ? "bg-green-500/20 text-green-400 border-green-500/30" 
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          )}
                        >
                          {override.is_available ? 'Available' : 'Not available'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {override.is_available && override.start_time && override.end_time && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      <span>{override.start_time} - {override.end_time}</span>
                    </div>
                  )}
                  
                  {override.reason && (
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-3">
                      {override.reason}
                    </p>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeOverride(override.id)}
                  className="text-destructive hover:text-destructive bg-destructive/10 hover:bg-destructive/20 border-destructive/20 rounded-2xl"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No schedule exceptions yet.</p>
        </div>
      )}

      {/* Add Button */}
      {!showAddForm && (
        <Button
          onClick={() => setShowAddForm(true)}
          className="w-full bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 border-2 border-dashed rounded-3xl h-14 font-medium"
          variant="outline"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Schedule Exception
        </Button>
      )}
    </div>
  );
};
