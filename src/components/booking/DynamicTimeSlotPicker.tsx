import { useState, useEffect } from 'react';
import { useBusinessSlots } from '@/hooks/useBusinessSlots';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Users } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';

interface DynamicTimeSlotPickerProps {
  calendarSlug: string;
  serviceTypeId?: string;
  onSlotSelect: (slot: any) => void;
  selectedSlot?: any;
  className?: string;
}

export function DynamicTimeSlotPicker({
  calendarSlug,
  serviceTypeId,
  onSlotSelect,
  selectedSlot,
  className = ""
}: DynamicTimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const { loading, getBusinessSlots } = useBusinessSlots();
  const [slots, setSlots] = useState<any[]>([]);

  useEffect(() => {
    if (calendarSlug && serviceTypeId) {
      loadSlots();
    }
  }, [calendarSlug, serviceTypeId, selectedDate]);

  const loadSlots = async () => {
    try {
      const slotsData = await getBusinessSlots(
        calendarSlug,
        serviceTypeId,
        selectedDate,
        1 // Just one day
      );
      setSlots(slotsData);
    } catch (error) {
      console.error('Error loading slots:', error);
      setSlots([]);
    }
  };

  const availableSlots = slots.filter(slot => slot.is_available);
  const unavailableSlots = slots.filter(slot => !slot.is_available);

  const handleSlotClick = (slot: any) => {
    onSlotSelect(slot);
  };

  const isSlotSelected = (slot: any) => {
    return selectedSlot && 
           format(new Date(selectedSlot.slot_start), 'HH:mm') === format(new Date(slot.slot_start), 'HH:mm') &&
           format(new Date(selectedSlot.slot_start), 'yyyy-MM-dd') === format(new Date(slot.slot_start), 'yyyy-MM-dd');
  };

  // Generate next 14 days for date selection
  const generateDateOptions = () => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      dates.push(addDays(new Date(), i));
    }
    return dates;
  };

  const dateOptions = generateDateOptions();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Beschikbare tijden laden...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Kies datum en tijd
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selection */}
        <div>
          <h4 className="text-sm font-medium mb-3">Selecteer datum</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
            {dateOptions.map((date) => (
              <Button
                key={date.toISOString()}
                variant={
                  format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                onClick={() => setSelectedDate(startOfDay(date))}
                className="text-xs p-2 h-auto flex flex-col"
              >
                <span className="font-medium">
                  {format(date, 'EEE', { locale: nl })}
                </span>
                <span className="text-xs">
                  {format(date, 'd MMM', { locale: nl })}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Beschikbare tijden voor {format(selectedDate, 'd MMMM yyyy', { locale: nl })}
          </h4>
          
          {availableSlots.length === 0 && !loading ? (
            <div className="text-center p-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Geen beschikbare tijden voor deze datum</p>
              <p className="text-sm">Probeer een andere datum</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {availableSlots.map((slot, index) => (
                <Button
                  key={index}
                  variant={isSlotSelected(slot) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSlotClick(slot)}
                  className="text-xs p-2 h-auto flex flex-col"
                >
                  <span className="font-medium">
                    {format(new Date(slot.slot_start), 'HH:mm')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {slot.duration_minutes}min
                  </span>
                </Button>
              ))}
            </div>
          )}

          {/* Show unavailable slots for reference */}
          {unavailableSlots.length > 0 && (
            <div className="mt-4">
              <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Bezet ({unavailableSlots.length})
              </h5>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1">
                {unavailableSlots.slice(0, 12).map((slot, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs p-1 justify-center opacity-50"
                  >
                    {format(new Date(slot.slot_start), 'HH:mm')}
                  </Badge>
                ))}
                {unavailableSlots.length > 12 && (
                  <Badge variant="secondary" className="text-xs p-1 justify-center opacity-50">
                    +{unavailableSlots.length - 12}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected Slot Info */}
        {selectedSlot && (
          <div className="mt-4 p-3 bg-primary/10 rounded-lg">
            <h5 className="text-sm font-medium mb-1">Geselecteerd tijdslot</h5>
            <p className="text-sm text-muted-foreground">
              {format(new Date(selectedSlot.slot_start), 'EEEE d MMMM yyyy, HH:mm', { locale: nl })} 
              {' - '}
              {format(new Date(selectedSlot.slot_end), 'HH:mm')}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedSlot.service_name} ({selectedSlot.duration_minutes} minuten)
            </p>
            {selectedSlot.service_price && (
              <p className="text-sm font-medium">
                €{selectedSlot.service_price}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}