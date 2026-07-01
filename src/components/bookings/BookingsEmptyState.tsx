
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { Button } from '@/components/ui/button';

interface BookingsEmptyStateProps {
  hasFilters: boolean;
}

export function BookingsEmptyState({ hasFilters }: BookingsEmptyStateProps) {
  const { t } = useTranslation('appPages');
  const { selectedCalendar } = useCalendarContext();
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!selectedCalendar?.slug) return;
    const bookingUrl = `${window.location.origin}/book/${selectedCalendar.slug}`;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setLinkCopied(true);
      toast.success(t('bookPage.linkCopiedToast', 'Booking link copied'));
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast.error(t('bookPage.linkCopyFailed', 'Failed to copy link'));
    }
  };

  return (
    <div className="fade-up flex flex-col items-center text-center py-10">
      <div className="glow-accent-strong relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <Calendar aria-hidden="true" className="h-7 w-7 text-accent-foreground" />
      </div>
      {/* DESIGN_SPEC §2: serif-editorial headline for the warm onboarding empty state;
          the filtered "no results" stays crisp sans (utilitarian, not a warm moment). */}
      {hasFilters ? (
        <h3 className="mb-1 text-lg font-semibold text-foreground">{t('bookPage.emptyStateFiltered', 'No bookings found')}</h3>
      ) : (
        <h3 className="mb-1 font-serif text-2xl italic text-foreground">{t('bookPage.emptyStateHeading', 'Nothing booked yet')}</h3>
      )}
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasFilters
          ? t('bookPage.emptyStateFilteredDesc', 'Try adjusting your search or filters.')
          : t('bookPage.emptyStateDesc', 'Your first booking will appear here the moment a customer books over WhatsApp.')}
      </p>
      {!hasFilters && selectedCalendar?.slug && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-5 gap-2"
          onClick={handleCopyLink}
        >
          {linkCopied ? (
            <>
              <Check aria-hidden="true" className="h-3.5 w-3.5" />
              <span aria-live="polite">{t('bookPage.linkCopied', 'Copied!')}</span>
            </>
          ) : (
            <>
              <Copy aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{t('bookPage.copyBookingLink', 'Copy your booking link')}</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
