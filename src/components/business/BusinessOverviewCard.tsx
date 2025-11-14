import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Phone, Mail, Globe, ExternalLink } from 'lucide-react';
import { BusinessAvailabilityOverview } from '@/types/businessAvailability';

interface BusinessOverviewCardProps {
  business: BusinessAvailabilityOverview;
  onViewSlots?: (calendarSlug: string) => void;
  showFullDetails?: boolean;
}

export const BusinessOverviewCard: React.FC<BusinessOverviewCardProps> = ({
  business,
  onViewSlots,
  showFullDetails = false
}) => {
  const formatPrice = (price: number | null) => {
    if (!price) return 'Prijs op aanvraag';
    return `€${price.toFixed(2)}`;
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return '';
    return `${duration} min`;
  };

  const getBusinessTypeLabel = (type: string | null) => {
    const types: Record<string, string> = {
      'salon': 'Kapsalon',
      'clinic': 'Kliniek',
      'consultant': 'Consultant',
      'trainer': 'Trainer',
      'other': 'Overig'
    };
    return types[type || 'other'] || 'Onbekend';
  };

  // Get first service name for display
  const primaryService = business.services[0]?.name || null;

  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">
              {business.business_name || 'Naamloos bedrijf'}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                {getBusinessTypeLabel(business.business_type)}
              </Badge>
              {primaryService && (
                <Badge variant="outline">
                  {primaryService}
                </Badge>
              )}
            </div>
          </div>
          {onViewSlots && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewSlots(business.calendar_slug)}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Bekijk tijden
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {business.business_description && (
          <p className="text-sm text-muted-foreground">
            {business.business_description}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact informatie */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Contact</h4>
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
                  className="text-blue-600 hover:underline"
                >
                  Website <ExternalLink className="w-3 h-3 inline" />
                </a>
              </div>
            )}
          </div>

          {/* Locatie */}
          {(business.business_street || business.business_city) && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Adres</h4>
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

        {/* Openingstijden */}
        <div className="pt-2 border-t">
          <h4 className="font-semibold text-sm mb-2">Openingstijden</h4>
          {Object.keys(business.opening_hours).length > 0 ? (
            <div className="text-sm space-y-1">
              {Object.entries(business.opening_hours).map(([day, hours]) => (
                <div key={day} className="flex justify-between">
                  <span>{['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'][parseInt(day)]}</span>
                  <span>
                    {hours.is_available 
                      ? `${hours.start_time} - ${hours.end_time}`
                      : 'Gesloten'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Geen openingstijden ingesteld</p>
          )}
        </div>

        {/* Service informatie */}
        {business.services.length > 0 && business.services[0] && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold text-sm">Service details</h4>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(business.services[0].duration)}</span>
              </div>
              <div>
                <span className="font-medium">{formatPrice(business.services[0].price)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Kalender instellingen */}
        {showFullDetails && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-semibold text-sm">Boeking instellingen</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Min. voortijd: {business.minimum_notice_hours}u</div>
              <div>Slot duur: {business.slot_duration} min</div>
              <div>Boekingsvenster: {business.booking_window_days} dagen</div>
              <div>Wachtlijst: {business.allow_waitlist ? 'Ja' : 'Nee'}</div>
            </div>
          </div>
        )}

        {/* Statistieken */}
        {showFullDetails && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-semibold text-sm">Statistieken</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Boekingen: </span>
                <span className="font-medium">{business.total_bookings}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Omzet: </span>
                <span className="font-medium">€{Number(business.total_revenue).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
