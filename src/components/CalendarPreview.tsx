import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, User, Mail, Phone, CheckCircle } from 'lucide-react';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { WaitlistDialog } from './WaitlistDialog';
import { format, isToday, isTomorrow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface CalendarPreviewProps {
  calendarId: string;
}

export function CalendarPreview({ calendarId }: CalendarPreviewProps) {
  const { serviceTypes, loading: servicesLoading } = useServiceTypes();
  const { getAvailableSlots, loading: slotsLoading } = useAvailableSlots();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [showWaitlistDialog, setShowWaitlistDialog] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  // Fetch available slots when date and service type change
  useEffect(() => {
    if (selectedDate && selectedServiceType && calendarId) {
      const fetchSlots = async () => {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const slots = await getAvailableSlots(calendarId, selectedServiceType, dateString);
        setAvailableSlots(slots);
      };
      fetchSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDate, selectedServiceType, calendarId, getAvailableSlots]);

  // Reset selected slot when slots change
  useEffect(() => {
    setSelectedSlot('');
  }, [availableSlots]);

  const formatSlotTime = (slot: any) => {
    const startTime = new Date(slot.slot_start);
    const endTime = new Date(slot.slot_end);
    return `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`;
  };

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return `Vandaag, ${format(date, 'd MMMM', { locale: nl })}`;
    if (isTomorrow(date)) return `Morgen, ${format(date, 'd MMMM', { locale: nl })}`;
    return format(date, 'EEEE, d MMMM yyyy', { locale: nl });
  };

  const selectedService = serviceTypes.find(s => s.id === selectedServiceType);
  const selectedSlotData = availableSlots.find(s => s.slot_start === selectedSlot);
  const hasAvailableSlots = availableSlots.some(slot => slot.is_available);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2" />
          Klant Booking Ervaring Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Calendar & Slots */}
          <div className="space-y-6">
            <div className="bg-background-secondary rounded-lg p-6 border border-border">
              <h3 className="text-lg font-medium text-foreground mb-4">Select a service</h3>
              
              {servicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 bg-primary rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceTypes.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => setSelectedServiceType(service.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedServiceType === service.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: service.color }}
                          />
                          <div>
                            <h4 className="font-medium text-foreground">{service.name}</h4>
                            {service.description && (
                              <p className="text-sm text-muted-foreground">{service.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-foreground">
                            {service.price ? `€${service.price}` : 'Gratis'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {service.duration} min
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedServiceType && (
              <div className="bg-background-secondary rounded-lg p-6 border border-border">
                <h3 className="text-lg font-medium text-foreground mb-4">Select a date</h3>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border border-border"
                />
              </div>
            )}

            {selectedDate && selectedServiceType && (
              <div className="bg-background-secondary rounded-lg p-6 border border-border">
                <h3 className="text-lg font-medium text-foreground mb-4">
                  Beschikbare tijden - {formatDateLabel(selectedDate)}
                </h3>
                
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 bg-primary rounded-full animate-spin"></div>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <>
                    {hasAvailableSlots ? (
                      <div className="grid grid-cols-2 gap-2">
                        {availableSlots
                          .filter(slot => slot.is_available)
                          .map((slot) => (
                            <Button
                              key={slot.slot_start}
                              variant={selectedSlot === slot.slot_start ? "default" : "outline"}
                              onClick={() => setSelectedSlot(slot.slot_start)}
                              className="text-sm"
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              {formatSlotTime(slot)}
                            </Button>
                          ))
                        }
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="text-muted-foreground mb-4">Geen beschikbare tijden voor deze datum</p>
                        <Button 
                          onClick={() => setShowWaitlistDialog(true)}
                          variant="outline"
                          className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Add to waitlist
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Geen beschikbare tijden voor deze datum</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Booking Form */}
          <div className="space-y-6">
            <div className="bg-background-secondary rounded-lg p-6 border border-border">
              <h3 className="text-lg font-medium text-foreground mb-4">Booking Overzicht</h3>
              
              {selectedService && selectedDate && selectedSlotData ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: selectedService.color }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{selectedService.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedService.duration} minuten - {selectedService.price ? `€${selectedService.price}` : 'Gratis'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-card rounded-lg border border-border">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium text-foreground">{formatDateLabel(selectedDate)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatSlotTime(selectedSlotData)}
                      </div>
                    </div>
                  </div>

                  <Badge variant="outline" className="w-fit">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Beschikbaar
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Select a service, date and time to continue</p>
                </div>
              )}
            </div>

            {selectedSlot && (
              <div className="bg-background-secondary rounded-lg p-6 border border-border">
                <h3 className="text-lg font-medium text-foreground mb-4">Jouw gegevens</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Naam *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="je@email.com"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefoonnummer</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+31 6 12345678"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Opmerkingen (optioneel)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Eventuele opmerkingen of speciale wensen..."
                      value={customerForm.notes}
                      onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                      className="bg-input border-border"
                      rows={3}
                    />
                  </div>

                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={!customerForm.name || !customerForm.email}
                  >
                    Afspraak Bevestigen
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Je ontvangt een bevestiging via e-mail
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Waitlist Dialog */}
        {selectedService && selectedDate && (
          <WaitlistDialog
            open={showWaitlistDialog}
            onOpenChange={setShowWaitlistDialog}
            calendarSlug={`calendar-${calendarId}`} // This would need to come from props in real implementation
            serviceTypeId={selectedServiceType}
            serviceName={selectedService.name}
            onSuccess={() => {
              // Could refresh available slots or show success message
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
