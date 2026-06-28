import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, Clock, MapPin, Phone, Mail, Globe, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { BusinessOverview, CalendarOverview } from '@/types/businessAvailability';

interface BusinessOverviewCardProps {
  business: BusinessOverview;
  onViewSlots?: (calendarSlug: string) => void;
  showFullDetails?: boolean;
}

export const BusinessOverviewCard: React.FC<BusinessOverviewCardProps> = ({
  business,
  onViewSlots,
  showFullDetails = false
}) => {
  const { t } = useTranslation('businessSearch');
  const [expandedCalendars, setExpandedCalendars] = useState<string[]>([]);

  const formatPrice = (price: number | null) => {
    if (!price) return t('businessSearch.card.priceOnRequest', 'Price on request');
    return `€${price.toFixed(2)}`;
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return '';
    return `${duration} min`;
  };

  const getBusinessTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      'salon': t('businessSearch.types.salon', 'Hair Salon'),
      'clinic': t('businessSearch.types.clinic', 'Clinic'),
      'consultant': t('businessSearch.types.consultant', 'Consultant'),
      'trainer': t('businessSearch.types.trainer', 'Trainer'),
      'other': t('businessSearch.types.other', 'Other')
    };
    return types[type || 'other'] || t('businessSearch.types.unknown', 'Unknown');
  };

  const toggleCalendar = (calendarId: string) => {
    setExpandedCalendars(prev => 
      prev.includes(calendarId) 
        ? prev.filter(id => id !== calendarId)
        : [...prev, calendarId]
    );
  };

  // Get all services from all calendars for primary display
  const allServices = business.calendars.flatMap(cal => cal.services);
  const primaryService = allServices[0]?.name || null;

  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">
              {business.business_name || t('businessSearch.card.unnamedBusiness', 'Unnamed business')}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary">
                {getBusinessTypeLabel(business.business_type)}
              </Badge>
              <Badge variant="outline">
                {business.total_calendars} {business.total_calendars !== 1 ? t('businessSearch.card.calendarPlural', 'calendars') : t('businessSearch.card.calendarSingular', 'calendar')}
              </Badge>
              {primaryService && (
                <Badge variant="outline">
                  {primaryService}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {business.business_description && (
          <p className="text-sm text-muted-foreground">
            {business.business_description}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact information */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">{t('businessSearch.card.contact', 'Contact')}</h4>
            {business.business_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4" />
                <span>{business.business_phone}</span>
              </div>
            )}
            {business.business_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4" />
                <span>{business.business_email}</span>
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4" />
                <a 
                  href={business.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t('businessSearch.card.website', 'Website')} <ExternalLink className="w-3 h-3 inline" />
                </a>
              </div>
            )}
          </div>

          {/* Location */}
          {(business.business_street || business.business_city) && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">{t('businessSearch.card.address', 'Address')}</h4>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5" />
                <div>
                  {business.business_street && business.business_number && (
                    <div>{business.business_street} {business.business_number}</div>
                  )}
                  {business.business_postal && business.business_city && (
                    <div>{business.business_postal} {business.business_city}</div>
                  )}
                  {business.business_country && (
                    <div>{business.business_country}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Calendars Section */}
        <div className="pt-2 border-t">
          <h4 className="font-semibold text-sm mb-3">{t('businessSearch.card.calendarsHeading', 'Calendars')} ({business.calendars.length})</h4>
          <div className="space-y-2">
            {business.calendars.map((calendar) => (
              <CalendarItem 
                key={calendar.calendar_id}
                calendar={calendar}
                isExpanded={expandedCalendars.includes(calendar.calendar_id)}
                onToggle={() => toggleCalendar(calendar.calendar_id)}
                onViewSlots={onViewSlots}
                formatPrice={formatPrice}
                formatDuration={formatDuration}
              />
            ))}
          </div>
        </div>

        {/* Statistics */}
        {showFullDetails && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-semibold text-sm">{t('businessSearch.card.totalStats', 'Total Statistics')}</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">{t('businessSearch.card.totalBookings', 'Total Bookings:')} </span>
                <span className="font-medium">{business.total_bookings}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('businessSearch.card.totalRevenue', 'Total Revenue:')} </span>
                <span className="font-medium">€{Number(business.total_revenue || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Sub-component for individual calendar
interface CalendarItemProps {
  calendar: CalendarOverview;
  isExpanded: boolean;
  onToggle: () => void;
  onViewSlots?: (calendarSlug: string) => void;
  formatPrice: (price: number | null) => string;
  formatDuration: (duration: number | null) => string;
}

const CalendarItem: React.FC<CalendarItemProps> = ({
  calendar,
  isExpanded,
  onToggle,
  onViewSlots,
  formatPrice,
  formatDuration
}) => {
  const { t } = useTranslation('businessSearch');
  const dayLabels = [
    t('businessSearch.card.dMon', 'Mon'),
    t('businessSearch.card.dTue', 'Tue'),
    t('businessSearch.card.dWed', 'Wed'),
    t('businessSearch.card.dThu', 'Thu'),
    t('businessSearch.card.dFri', 'Fri'),
    t('businessSearch.card.dSat', 'Sat'),
    t('businessSearch.card.dSun', 'Sun'),
  ];
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: calendar.calendar_color || '#3B82F6' }}
              />
              <span className="font-medium text-sm">{calendar.calendar_name || t('businessSearch.card.unnamedCalendar', 'Unnamed calendar')}</span>
              {!calendar.calendar_active && (
                <Badge variant="outline" className="text-xs">{t('businessSearch.card.inactive', 'Inactive')}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {calendar.services.length} {calendar.services.length !== 1 ? t('businessSearch.card.servicePlural', 'services') : t('businessSearch.card.serviceSingular', 'service')}
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3 border-t">
            {/* Services */}
            {calendar.services.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">{t('businessSearch.card.servicesHeading', 'Services')}</h5>
                <div className="space-y-1">
                  {calendar.services.map((service) => (
                    <div key={service.service_id} className="flex justify-between text-sm">
                      <span>{service.name}</span>
                      <span className="text-muted-foreground">
                        {formatDuration(service.duration)} • {formatPrice(service.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opening hours */}
            {Object.keys(calendar.opening_hours).length > 0 && (
              <div>
                <h5 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">{t('businessSearch.card.openingHours', 'Opening Hours')}</h5>
                <div className="text-sm space-y-0.5">
                  {Object.entries(calendar.opening_hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-xs">
                      <span>{dayLabels[parseInt(day) - 1] || day}</span>
                      <span>
                        {hours.is_available
                          ? `${hours.start_time} - ${hours.end_time}`
                          : t('businessSearch.card.closed', 'Closed')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {onViewSlots && calendar.calendar_slug && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onViewSlots(calendar.calendar_slug!)}
              >
                <Calendar className="w-4 h-4 mr-1" />
                {t('businessSearch.card.viewTimes', 'View available times')}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
