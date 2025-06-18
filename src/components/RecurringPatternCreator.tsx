
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Calendar,
  Clock,
  Repeat,
  CalendarDays,
  Sun
} from 'lucide-react';

interface RecurringPatternCreatorProps {
  calendarId: string;
  onPatternCreate: (pattern: any) => Promise<void>;
}

const DAYS_OF_WEEK = [
  { value: '0', label: 'Zondag', short: 'Zo' },
  { value: '1', label: 'Maandag', short: 'Ma' },
  { value: '2', label: 'Dinsdag', short: 'Di' },
  { value: '3', label: 'Woensdag', short: 'Wo' },
  { value: '4', label: 'Donderdag', short: 'Do' },
  { value: '5', label: 'Vrijdag', short: 'Vr' },
  { value: '6', label: 'Zaterdag', short: 'Za' },
];

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maart' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Augustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function RecurringPatternCreator({ onPatternCreate }: RecurringPatternCreatorProps) {
  const [open, setOpen] = useState(false);
  const [patternType, setPatternType] = useState<'weekly' | 'biweekly' | 'monthly' | 'seasonal'>('weekly');
  const [patternName, setPatternName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState([{ start: '09:00', end: '17:00' }]);
  
  // Biweekly specific
  const [week1Days, setWeek1Days] = useState<string[]>([]);
  const [week2Days, setWeek2Days] = useState<string[]>([]);
  
  // Monthly specific
  const [monthlyOccurrence, setMonthlyOccurrence] = useState<'first' | 'last'>('first');
  
  // Seasonal specific
  const [startMonth, setStartMonth] = useState<number>(6);
  const [endMonth, setEndMonth] = useState<number>(8);

  const handleDayToggle = (dayValue: string, weekType?: 'week1' | 'week2') => {
    if (patternType === 'biweekly') {
      if (weekType === 'week1') {
        setWeek1Days(prev => 
          prev.includes(dayValue) 
            ? prev.filter(d => d !== dayValue)
            : [...prev, dayValue]
        );
      } else if (weekType === 'week2') {
        setWeek2Days(prev => 
          prev.includes(dayValue) 
            ? prev.filter(d => d !== dayValue)
            : [...prev, dayValue]
        );
      }
    } else {
      setSelectedDays(prev => 
        prev.includes(dayValue) 
          ? prev.filter(d => d !== dayValue)
          : [...prev, dayValue]
      );
    }
  };

  const addTimeSlot = () => {
    setTimeSlots(prev => [...prev, { start: '09:00', end: '17:00' }]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(prev => prev.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    setTimeSlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    ));
  };

  const buildScheduleData = () => {
    const baseData = {
      time_slots: timeSlots
    };

    switch (patternType) {
      case 'weekly':
        return {
          ...baseData,
          days: selectedDays,
          availability: { time_slots: timeSlots }
        };
      
      case 'biweekly':
        return {
          ...baseData,
          week1_days: week1Days,
          week2_days: week2Days,
          week1_availability: { time_slots: timeSlots },
          week2_availability: { time_slots: timeSlots }
        };
      
      case 'monthly':
        return {
          ...baseData,
          days: selectedDays,
          occurrence: monthlyOccurrence,
          availability: { time_slots: timeSlots }
        };
      
      case 'seasonal':
        return {
          ...baseData,
          days: selectedDays,
          start_month: startMonth,
          end_month: endMonth,
          availability: { time_slots: timeSlots }
        };
    }
  };

  const handleSubmit = async () => {
    if (!patternName || !startDate) return;

    const scheduleData = buildScheduleData();
    
    await onPatternCreate({
      pattern_type: patternType,
      pattern_name: patternName,
      start_date: startDate,
      end_date: endDate || null,
      schedule_data: scheduleData,
      is_active: true
    });
    
    // Reset form
    setPatternName('');
    setStartDate('');
    setEndDate('');
    setSelectedDays([]);
    setWeek1Days([]);
    setWeek2Days([]);
    setTimeSlots([{ start: '09:00', end: '17:00' }]);
    setOpen(false);
  };

  const renderPatternSpecificFields = () => {
    switch (patternType) {
      case 'weekly':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Selecteer dagen</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    variant={selectedDays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(day.value)}
                    className="text-xs"
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'biweekly':
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Week 1 dagen</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    variant={week1Days.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(day.value, 'week1')}
                    className="text-xs"
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Week 2 dagen</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    variant={week2Days.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(day.value, 'week2')}
                    className="text-xs"
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'monthly':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Voorkomend</Label>
              <Select value={monthlyOccurrence} onValueChange={(value: any) => setMonthlyOccurrence(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">Eerste week van de maand</SelectItem>
                  <SelectItem value="last">Laatste week van de maand</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Selecteer dagen</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    variant={selectedDays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(day.value)}
                    className="text-xs"
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'seasonal':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Van maand</Label>
                <Select value={startMonth.toString()} onValueChange={(value) => setStartMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Tot maand</Label>
                <Select value={endMonth.toString()} onValueChange={(value) => setEndMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Selecteer dagen</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    variant={selectedDays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(day.value)}
                    className="text-xs"
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'weekly': return <Repeat className="h-4 w-4" />;
      case 'biweekly': return <CalendarDays className="h-4 w-4" />;
      case 'monthly': return <Calendar className="h-4 w-4" />;
      case 'seasonal': return <Sun className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Nieuw Patroon
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terugkerend Beschikbaarheidspatroon</DialogTitle>
          <DialogDescription>
            Maak een terugkerend patroon voor je beschikbaarheid
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pattern Type Selection */}
          <div>
            <Label className="text-sm font-medium">Patroon Type</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[
                { value: 'weekly', label: 'Wekelijks', desc: 'Elke week hetzelfde' },
                { value: 'biweekly', label: 'Tweewekelijks', desc: 'Afwisselende weken' },
                { value: 'monthly', label: 'Maandelijks', desc: 'Specifieke weken' },
                { value: 'seasonal', label: 'Seizoensgebonden', desc: 'Bepaalde maanden' }
              ].map((type) => (
                <Card 
                  key={type.value}
                  className={`cursor-pointer transition-colors ${
                    patternType === type.value ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setPatternType(type.value as any)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      {getPatternIcon(type.value)}
                      <div>
                        <div className="font-medium text-sm">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.desc}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="patternName">Patroon Naam</Label>
              <Input
                id="patternName"
                value={patternName}
                onChange={(e) => setPatternName(e.target.value)}
                placeholder="bijv. Zomer Schema, Weekend Shifts"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Startdatum</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Einddatum (optioneel)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Pattern Specific Fields */}
          {renderPatternSpecificFields()}

          {/* Time Slots */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Tijdsloten</Label>
              <Button variant="outline" size="sm" onClick={addTimeSlot}>
                <Plus className="h-3 w-3 mr-1" />
                Toevoegen
              </Button>
            </div>
            
            <div className="space-y-2">
              {timeSlots.map((slot, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    type="time"
                    value={slot.start}
                    onChange={(e) => updateTimeSlot(index, 'start', e.target.value)}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">tot</span>
                  <Input
                    type="time"
                    value={slot.end}
                    onChange={(e) => updateTimeSlot(index, 'end', e.target.value)}
                    className="w-28"
                  />
                  {timeSlots.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTimeSlot(index)}
                      className="text-destructive"
                    >
                      Verwijder
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSubmit} disabled={!patternName || !startDate}>
              Patroon Aanmaken
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
