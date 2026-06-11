import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { usePublicBookingCreation } from '@/hooks/usePublicBookingCreation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Loader2, PencilLine } from 'lucide-react';

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

const priceLabel = (p: number | null) =>
  p == null ? null : p === 0 ? 'Gratis' : `€${Number(p).toFixed(2)}`;

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

  const initial = (calendar?.name || '?').trim().charAt(0).toUpperCase();

  // Soft branded dark backdrop shared by every state.
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f1a] text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70"
        style={{
          background:
            'radial-gradient(60% 80% at 50% 0%, hsl(142 69% 45% / 0.18), transparent 70%)',
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-start px-4 py-10 sm:py-16">
        {children}
      </div>
    </div>
  );

  if (loadingCal) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/50" />
        </div>
      </Shell>
    );
  }

  if (!calendar) {
    return (
      <Shell>
        <div className="mt-16 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/40">
            <CalendarDays className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold">Niet gevonden</h1>
          <p className="mt-2 text-sm text-white/50">
            Deze boekingspagina bestaat niet of is niet meer actief.
          </p>
        </div>
      </Shell>
    );
  }

  if (confirmed) {
    return (
      <Shell>
        <div className="mt-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
          <div className="flex flex-col items-center px-8 pt-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold">Afspraak bevestigd</h1>
            <p className="mt-1.5 text-sm text-white/50">
              Bedankt {customer.name.split(' ')[0]}, we hebben je aanvraag ontvangen.
            </p>
          </div>
          <div className="mt-6 space-y-3 border-t border-white/10 px-8 py-6 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/45">Dienst</span>
              <span className="font-medium">{service?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/45">Datum</span>
              <span className="font-medium">
                {slot && format(new Date(slot.slot_start), 'EEEE d MMMM', { locale: nl })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/45">Tijd</span>
              <span className="font-medium">
                {slot && format(new Date(slot.slot_start), 'HH:mm')}
                {slot && ` – ${format(new Date(slot.slot_end), 'HH:mm')}`}
              </span>
            </div>
          </div>
          <p className="border-t border-white/10 px-8 py-4 text-center text-xs text-white/40">
            Je ontvangt een bevestiging per e-mail.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Business header */}
      <header className="mb-8 flex w-full max-w-xl flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-xl font-semibold text-primary ring-1 ring-primary/30">
          {initial}
        </div>
        <h1 className="mt-4 font-garamond text-3xl font-medium tracking-tight sm:text-4xl">
          {calendar.name}
        </h1>
        <p className="mt-1 text-sm text-white/45">Maak online een afspraak</p>
      </header>

      <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] shadow-2xl shadow-black/40 backdrop-blur">
        {/* Step 1 — service */}
        {!service && (
          <div className="p-6 sm:p-8">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
              Kies een dienst
            </h2>
            {services.length === 0 ? (
              <p className="text-sm text-white/50">Geen diensten beschikbaar.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setService(s)}
                    className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.06]"
                  >
                    <span className="font-medium text-white">{s.name}</span>
                    <span className="mt-2 flex items-center gap-3 text-sm text-white/50">
                      {s.duration != null && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {s.duration} min
                        </span>
                      )}
                      {priceLabel(s.price) && (
                        <span className="font-medium text-primary">{priceLabel(s.price)}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Steps 2–4 — date / time / details */}
        {service && (
          <div>
            {/* Selected service summary bar */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-6 py-4 sm:px-8">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{service.name}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-white/45">
                  {service.duration != null && <span>{service.duration} min</span>}
                  {service.duration != null && priceLabel(service.price) && <span>·</span>}
                  {priceLabel(service.price) && (
                    <span className="text-primary">{priceLabel(service.price)}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setService(null);
                  setDate(undefined);
                  setSlot(null);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/25 hover:text-white"
              >
                <PencilLine className="h-3.5 w-3.5" /> Wijzig
              </button>
            </div>

            <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[auto,1fr]">
              {/* Date */}
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Kies een datum
                </h2>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                />
              </div>

              {/* Time */}
              <div className="md:border-l md:border-white/10 md:pl-6">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  {date
                    ? format(date, 'EEEE d MMMM', { locale: nl })
                    : 'Kies een tijd'}
                </h2>
                {!date ? (
                  <p className="text-sm text-white/40">Selecteer eerst een datum.</p>
                ) : loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Loader2 className="h-4 w-4 animate-spin" /> Beschikbaarheid laden…
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-white/40">
                    Geen vrije tijden op deze dag. Kies een andere datum.
                  </p>
                ) : (
                  <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                    {slots.map((s) => {
                      const active = slot?.slot_start === s.slot_start;
                      return (
                        <button
                          key={s.slot_start}
                          onClick={() => setSlot(s)}
                          className={`rounded-lg border py-2.5 text-sm font-medium transition ${
                            active
                              ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                              : 'border-white/10 text-white/80 hover:border-primary/50 hover:bg-primary/[0.08]'
                          }`}
                        >
                          {format(new Date(s.slot_start), 'HH:mm')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            {slot && (
              <div className="border-t border-white/10 p-6 sm:p-8">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Je gegevens
                </h2>

                {/* Recap */}
                <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-3 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="font-medium">{service.name}</span>
                  <span className="text-white/40">·</span>
                  <span>{format(new Date(slot.slot_start), 'EEEE d MMMM', { locale: nl })}</span>
                  <span className="text-white/40">·</span>
                  <span>
                    {format(new Date(slot.slot_start), 'HH:mm')}–
                    {format(new Date(slot.slot_end), 'HH:mm')}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-white/70">
                      Naam *
                    </Label>
                    <Input
                      id="name"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      className="border-white/10 bg-white/[0.03]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-white/70">
                      E-mail *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={customer.email}
                      onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                      className="border-white/10 bg-white/[0.03]"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="phone" className="text-white/70">
                      Telefoon <span className="text-white/30">(optioneel)</span>
                    </Label>
                    <Input
                      id="phone"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      className="border-white/10 bg-white/[0.03]"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || booking}
                  className="mt-6 h-12 w-full rounded-xl text-base font-medium shadow-lg shadow-primary/20"
                >
                  {booking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bezig…
                    </>
                  ) : (
                    'Afspraak bevestigen'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Back to service from any later step (mobile-friendly) */}
      {service && (
        <button
          onClick={() => {
            setService(null);
            setDate(undefined);
            setSlot(null);
          }}
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition hover:text-white/70"
        >
          <ArrowLeft className="h-4 w-4" /> Andere dienst kiezen
        </button>
      )}

      <p className="mt-8 text-center text-xs text-white/25">
        Mogelijk gemaakt door Bookings Assistant
      </p>
    </Shell>
  );
}
