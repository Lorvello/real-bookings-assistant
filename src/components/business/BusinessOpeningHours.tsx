
import React from 'react';
import { Clock } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface BusinessOpeningHoursProps {
  formattedOpeningHours?: string | null;
  availabilityRules?: Json | null;
  showCompact?: boolean;
}

export const BusinessOpeningHours: React.FC<BusinessOpeningHoursProps> = ({
  formattedOpeningHours,
  availabilityRules,
  showCompact = false
}) => {
  // Helper functie om availability rules te parsen
  const parseAvailabilityRules = () => {
    if (!availabilityRules || typeof availabilityRules !== 'object') {
      return [];
    }
    
    try {
      const rules = Array.isArray(availabilityRules) ? availabilityRules : [];
      return rules.map((rule: any) => ({
        day_of_week: rule.day_of_week || 0,
        day_name_dutch: rule.day_name_dutch || 'Onbekend',
        start_time: rule.start_time || '09:00',
        end_time: rule.end_time || '17:00',
        is_available: rule.is_available !== false
      }));
    } catch (error) {
      console.error('Error parsing availability rules:', error);
      return [];
    }
  };

  // Als we geformatteerde openingstijden hebben, gebruik die
  if (formattedOpeningHours && showCompact) {
    return (
      <div className="flex items-start gap-2 text-sm">
        <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
        <div className="whitespace-pre-line text-muted-foreground">
          {formattedOpeningHours}
        </div>
      </div>
    );
  }

  // Anders parse de availability rules
  const rules = parseAvailabilityRules();
  
  if (rules.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Openingstijden niet beschikbaar</span>
      </div>
    );
  }

  if (showCompact) {
    // Compacte weergave - toon alleen dagen dat ze open zijn
    const openDays = rules.filter(rule => rule.is_available);
    if (openDays.length === 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Gesloten</span>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-2 text-sm">
        <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
        <div className="text-muted-foreground">
          {openDays.slice(0, 2).map((rule, index) => (
            <div key={rule.day_of_week}>
              {rule.day_name_dutch}: {rule.start_time} - {rule.end_time}
            </div>
          ))}
          {openDays.length > 2 && (
            <div className="text-xs">+ {openDays.length - 2} meer</div>
          )}
        </div>
      </div>
    );
  }

  // Volledige weergave
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Openingstijden
      </h4>
      <div className="space-y-1 text-sm">
        {rules.map((rule) => (
          <div key={rule.day_of_week} className="flex justify-between">
            <span className="text-muted-foreground">{rule.day_name_dutch}:</span>
            <span className={rule.is_available ? '' : 'text-muted-foreground'}>
              {rule.is_available 
                ? `${rule.start_time} - ${rule.end_time}`
                : 'Gesloten'
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
