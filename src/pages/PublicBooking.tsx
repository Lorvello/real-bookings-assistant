import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { usePublicBookingCreation } from '@/hooks/usePublicBookingCreation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';

interface CalendarInfo {
  id: string;
  name: string;
  slug: string;
}

interface ServiceType {
  id: string;
  name: string;
  duration: number | null;
  price: number | null;
}

interface Slot {
  slot_start: string;
  slot_end: string;
  is_available: boolean;
}

/**
 * Public, no-login booking page for end customers. Reached at /book/:slug.
 * Reuses the production create-booking flow (validation + rate limiting live in
 * usePublicBookingCreation / the create-booking edge function).
 */
export default function PublicBooking() {
  const { slug = '' } = useParams();
  const { getAvailableSlots } = useAvailableSlots();
  const { createBooking, loading: booking } = usePublicBookingCreation();

  const [calendar, setCalendar] = useState<CalendarInfo | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);

  const [service, setService] = useState<ServiceType | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);

  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [confirmed, setConfirmed] = useState(false);

  // Load the calendar + its active services for this slug
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCal(true);
      const { data: cal } = await supabase
        .from('calendars')
        .select('id, name, slug')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (cancelled) return;
      if (!cal) {
        setCalendar(null);
        setLoadingCal(false);
        return;
      }
      setCalendar(cal as CalendarInfo);
      const { data: svc } = await supabase
        .from('service_types')
        .select('id, name, duration, price')
        .eq('calendar_id', cal.id)
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (cancelled) return;
      setServices((svc as ServiceType[]) ?? []);
      setLoadingCal(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Fetch slots whenever service + date are chosen
  useEffect(() => {
    if (!calendar || !service || !date) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      setSlot(null);
      const result = await getAvailableSlots(calendar.id, service.id, format(date, 'yyyy-MM-dd'));
      if (cancelled) return;
      setSlots(result.filter((s) => s.is_available));
      setLoadingSlots(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [calendar, service, date]);

  const canSubmit = useMemo(
    () => !!(slot && customer.name.trim() && customer.email.trim()),
    [slot, customer]
  );

  const handleSubmit = async () => {
    if (!calendar || !service || !slot) return;
    const result = await createBooking({
      calendarSlug: calendar.slug,
      serviceTypeId: service.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone || undefined,
      startTime: new Date(slot.slot_start),
      endTime: new Date(slot.slot_end),
    });
    if (result.success) setConfirmed(true);
  };

  if (loadingCal) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Niet gevonden</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Deze boekingspagina bestaat niet of is niet meer actief.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <CardTitle>Afspraak aangevraagd</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>
              Bedankt {customer.name.split(' ')[0]}! Je afspraak voor{' '}
              <strong>{service?.name}</strong> op{' '}
              <strong>{slot && format(new Date(slot.slot_start), "d MMMM 'om' HH:mm", { locale: nl })}</strong> is
              ontvangen.
            </p>
            <p>Je ontvangt een bevestiging per e-mail.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold">{calendar.name}</h1>
      <p className="mb-6 text-muted-foreground">Maak online een afspraak</p>

      {/* 1. Service */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">1. Kies een dienst</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground">Geen diensten beschikbaar.</p>
          )}
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setService(s);
                setSlot(null);
              }}
              className={`rounded-lg border p-3 text-left transition ${
                service?.id === s.id ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted'
              }`}
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-sm text-muted-foreground">
                {s.duration ? `${s.duration} min` : ''}
                {s.duration && s.price != null ? ' · ' : ''}
                {s.price != null ? `€${Number(s.price).toFixed(2)}` : ''}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* 2. Date */}
      {service && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">2. Kies een datum</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      )}

      {/* 3. Slot */}
      {service && date && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">3. Kies een tijd</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Beschikbaarheid laden…
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Geen vrije tijden op deze dag. Kies een andere datum.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => (
                  <button
                    key={s.slot_start}
                    onClick={() => setSlot(s)}
                    className={`flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition ${
                      slot?.slot_start === s.slot_start
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(s.slot_start), 'HH:mm')}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Details */}
      {slot && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">4. Je gegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name">Naam *</Label>
              <Input
                id="name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Telefoon</Label>
              <Input
                id="phone"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
            <Button onClick={handleSubmit} disabled={!canSubmit || booking} className="w-full">
              {booking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bezig…
                </>
              ) : (
                'Afspraak bevestigen'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
