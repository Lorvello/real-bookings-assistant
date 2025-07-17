import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, Plus, Trash2, Calendar as CalendarIcon, Clock, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ProfessionalTimePicker } from './ProfessionalTimePicker';

interface DateOverride {
  id: string;
  startDate: string;
  endDate?: string; // For range selection
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
  type: 'single' | 'range';
}

interface DateOverridesProps {
  onChange?: () => void;
}

export const DateOverrides: React.FC<DateOverridesProps> = ({ onChange }) => {
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<{field: 'startTime' | 'endTime'} | null>(null);
  const [newOverride, setNewOverride] = useState<Partial<DateOverride>>({
    type: 'single',
    enabled: false,
    startTime: '09:00',
    endTime: '17:00',
    reason: ''
  });

  const addOverride = () => {
    if (!selectedDates.from) return;

    const override: DateOverride = {
      id: Date.now().toString(),
      startDate: selectedDates.from.toISOString().split('T')[0],
      endDate: selectedDates.to ? selectedDates.to.toISOString().split('T')[0] : undefined,
      type: selectedDates.to ? 'range' : 'single',
      enabled: newOverride.enabled || false,
      startTime: newOverride.enabled ? newOverride.startTime : undefined,
      endTime: newOverride.enabled ? newOverride.endTime : undefined,
      reason: newOverride.reason || ''
    };

    setOverrides(prev => [...prev, override].sort((a, b) => a.startDate.localeCompare(b.startDate)));
    resetForm();
    onChange?.();
  };

  const resetForm = () => {
    setSelectedDates({ from: undefined, to: undefined });
    setNewOverride({
      type: 'single',
      enabled: false,
      startTime: '09:00',
      endTime: '17:00',
      reason: ''
    });
    setShowAddForm(false);
  };

  const removeOverride = (id: string) => {
    setOverrides(prev => prev.filter(o => o.id !== id));
    onChange?.();
  };

  const formatDateRange = (override: DateOverride) => {
    const startDate = new Date(override.startDate);
    const endDate = override.endDate ? new Date(override.endDate) : null;

    if (override.type === 'range' && endDate) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    
    return format(startDate, 'EEEE, MMMM d, yyyy');
  };

  const handleTypeChange = (type: 'single' | 'range') => {
    setNewOverride(prev => ({ ...prev, type }));
    setSelectedDates({ from: undefined, to: undefined });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (newOverride.type === 'single') {
      setSelectedDates({ from: date, to: undefined });
    } else {
      // Range selection logic
      if (!selectedDates.from) {
        setSelectedDates({ from: date, to: undefined });
      } else if (!selectedDates.to) {
        if (date > selectedDates.from) {
          setSelectedDates(prev => ({ ...prev, to: date }));
        } else {
          setSelectedDates({ from: date, to: undefined });
        }
      } else {
        setSelectedDates({ from: date, to: undefined });
      }
    }
  };

  const handleRangeSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      setSelectedDates(range);
    }
  };

  const isDateSelected = selectedDates.from && (!newOverride.type || newOverride.type === 'single' || selectedDates.to);

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

            {/* Date Selection Type */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Selection Type</label>
              <div className="flex space-x-2">
                <Button
                  variant={newOverride.type === 'single' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTypeChange('single')}
                  className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                >
                  Single Day
                </Button>
                <Button
                  variant={newOverride.type === 'range' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTypeChange('range')}
                  className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                >
                  Date Range
                </Button>
              </div>
            </div>

            {/* Date Picker */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                {newOverride.type === 'range' ? 'Select Date Range' : 'Date'}
              </label>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background/80 border-border/60 rounded-2xl hover:border-primary/40 transition-colors h-12",
                      !selectedDates.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDates.from ? (
                      selectedDates.to ? (
                        <>
                          {format(selectedDates.from, "LLL dd, y")} - {format(selectedDates.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(selectedDates.from, "LLL dd, y")
                      )
                    ) : (
                      <span>{newOverride.type === 'range' ? 'Pick a date range' : 'Pick a date'}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border rounded-2xl" align="start">
                  {newOverride.type === 'range' ? (
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={selectedDates.from}
                      selected={selectedDates}
                      onSelect={handleRangeSelect}
                      numberOfMonths={2}
                      className={cn(
                        "rounded-2xl bg-card pointer-events-auto",
                        // Grid structure
                        "[&_.rdp-months]:grid [&_.rdp-months]:grid-cols-2 [&_.rdp-months]:gap-8",
                        // Day headers alignment and styling
                        "[&_.rdp-head_row]:grid [&_.rdp-head_row]:grid-cols-7 [&_.rdp-head_row]:gap-0",
                        "[&_.rdp-head_cell]:flex [&_.rdp-head_cell]:items-center [&_.rdp-head_cell]:justify-center",
                        "[&_.rdp-head_cell]:h-10 [&_.rdp-head_cell]:text-sm [&_.rdp-head_cell]:font-medium",
                        "[&_.rdp-head_cell]:text-muted-foreground [&_.rdp-head_cell]:border-b",
                        "[&_.rdp-head_cell]:border-border/30",
                        // Week rows grid
                        "[&_.rdp-week]:grid [&_.rdp-week]:grid-cols-7 [&_.rdp-week]:gap-0",
                        "[&_.rdp-week]:border-b [&_.rdp-week]:border-border/20",
                        // Day cells grid structure
                        "[&_.rdp-day]:h-10 [&_.rdp-day]:w-10 [&_.rdp-day]:flex [&_.rdp-day]:items-center",
                        "[&_.rdp-day]:justify-center [&_.rdp-day]:relative [&_.rdp-day]:border-r",
                        "[&_.rdp-day]:border-border/20 [&_.rdp-day:last-child]:border-r-0",
                        // Remove default table styling
                        "[&_.rdp-table]:border-collapse [&_.rdp-table]:w-full",
                        "[&_.rdp-tbody]:space-y-0"
                      )}
                    />
                  ) : (
                    <Calendar
                      initialFocus
                      mode="single"
                      defaultMonth={selectedDates.from}
                      selected={selectedDates.from}
                      onSelect={handleDateSelect}
                      numberOfMonths={1}
                      className={cn(
                        "rounded-2xl bg-card pointer-events-auto",
                        // Grid structure
                        "[&_.rdp-months]:grid [&_.rdp-months]:grid-cols-1",
                        // Day headers alignment and styling
                        "[&_.rdp-head_row]:grid [&_.rdp-head_row]:grid-cols-7 [&_.rdp-head_row]:gap-0",
                        "[&_.rdp-head_cell]:flex [&_.rdp-head_cell]:items-center [&_.rdp-head_cell]:justify-center",
                        "[&_.rdp-head_cell]:h-10 [&_.rdp-head_cell]:text-sm [&_.rdp-head_cell]:font-medium",
                        "[&_.rdp-head_cell]:text-muted-foreground [&_.rdp-head_cell]:border-b",
                        "[&_.rdp-head_cell]:border-border/30",
                        // Week rows grid
                        "[&_.rdp-week]:grid [&_.rdp-week]:grid-cols-7 [&_.rdp-week]:gap-0",
                        "[&_.rdp-week]:border-b [&_.rdp-week]:border-border/20",
                        // Day cells grid structure
                        "[&_.rdp-day]:h-10 [&_.rdp-day]:w-10 [&_.rdp-day]:flex [&_.rdp-day]:items-center",
                        "[&_.rdp-day]:justify-center [&_.rdp-day]:relative [&_.rdp-day]:border-r",
                        "[&_.rdp-day]:border-border/20 [&_.rdp-day:last-child]:border-r-0",
                        // Remove default table styling
                        "[&_.rdp-table]:border-collapse [&_.rdp-table]:w-full",
                        "[&_.rdp-tbody]:space-y-0"
                      )}
                    />
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Availability Toggle */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Available on this day</label>
              <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-2xl">
                <span className="text-sm font-medium text-foreground">
                  {newOverride.enabled ? 'Available' : 'Not available'}
                </span>
                <Switch
                  checked={newOverride.enabled}
                  onCheckedChange={(enabled) => setNewOverride(prev => ({ ...prev, enabled }))}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

            {/* Time Selection */}
            {newOverride.enabled && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">Working Hours</h4>
                <div className="bg-card/50 border border-border/40 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                      <ProfessionalTimePicker
                        value={newOverride.startTime || '09:00'}
                        onChange={(value) => setNewOverride(prev => ({ ...prev, startTime: value }))}
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
                        value={newOverride.endTime || '17:00'}
                        onChange={(value) => setNewOverride(prev => ({ ...prev, endTime: value }))}
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
                disabled={!isDateSelected}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl"
              >
                Add Exception
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Overrides */}
      {overrides.length > 0 && (
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
                      <h4 className="font-semibold text-foreground">{formatDateRange(override)}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant={override.enabled ? "default" : "secondary"}
                          className={cn(
                            "rounded-full",
                            override.enabled 
                              ? "bg-green-500/20 text-green-400 border-green-500/30" 
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          )}
                        >
                          {override.enabled ? 'Available' : 'Not available'}
                        </Badge>
                        {override.type === 'range' && (
                          <Badge variant="outline" className="rounded-full bg-blue-500/20 text-blue-400 border-blue-500/30">
                            Range
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {override.enabled && override.startTime && override.endTime && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      <span>{override.startTime} - {override.endTime}</span>
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
