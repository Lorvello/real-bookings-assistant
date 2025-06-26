
/**
 * N8N Day Mapping Helper
 * 
 * Dit bestand bevat hulpfuncties voor N8N om correct om te gaan met day_of_week waarden
 * uit de Supabase database.
 * 
 * BELANGRIJK: 
 * - day_of_week in de database gebruikt 0=Zondag, 1=Maandag, etc.
 * - Gebruik ALTIJD deze mapping bij het verwerken van availability_rules
 */

export const DAY_MAPPING = {
  0: 'Zondag',
  1: 'Maandag', 
  2: 'Dinsdag',
  3: 'Woensdag',
  4: 'Donderdag',
  5: 'Vrijdag',
  6: 'Zaterdag'
} as const;

export const DAY_MAPPING_EN = {
  0: 'Sunday',
  1: 'Monday', 
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
} as const;

export type DayOfWeek = keyof typeof DAY_MAPPING;

/**
 * Converteer day_of_week nummer naar Nederlandse dagnaam
 */
export function getDayNameDutch(dayOfWeek: number): string {
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return 'Onbekend';
  }
  return DAY_MAPPING[dayOfWeek as DayOfWeek];
}

/**
 * Converteer day_of_week nummer naar Engelse dagnaam
 */
export function getDayNameEnglish(dayOfWeek: number): string {
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return 'Unknown';
  }
  return DAY_MAPPING_EN[dayOfWeek as DayOfWeek];
}

/**
 * Parse availability rules en converteer naar leesbare format
 */
export function parseAvailabilityRules(availabilityRules: any): Array<{
  dayOfWeek: number;
  dayNameDutch: string;
  dayNameEnglish: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}> {
  if (!Array.isArray(availabilityRules)) {
    return [];
  }

  return availabilityRules.map(rule => ({
    dayOfWeek: rule.day_of_week || 0,
    dayNameDutch: getDayNameDutch(rule.day_of_week || 0),
    dayNameEnglish: getDayNameEnglish(rule.day_of_week || 0),
    startTime: rule.start_time || '09:00',
    endTime: rule.end_time || '17:00',
    isAvailable: rule.is_available !== false
  }));
}

/**
 * N8N Instructions - kopieer deze instructies naar je N8N workflow:
 * 
 * 1. Gebruik ALTIJD de DAY_MAPPING bij het interpreteren van day_of_week
 * 2. Voor gebruikersvriendelijke weergave: gebruik formatted_opening_hours uit de database
 * 3. Voor logica: parse de availability_rules JSON met parseAvailabilityRules()
 * 4. Onthoud: 0 = Zondag, 1 = Maandag, etc.
 * 
 * Voorbeeld N8N code:
 * ```javascript
 * const dayMapping = {0: 'Zondag', 1: 'Maandag', 2: 'Dinsdag', 3: 'Woensdag', 4: 'Donderdag', 5: 'Vrijdag', 6: 'Zaterdag'};
 * const dayName = dayMapping[dayOfWeek] || 'Onbekend';
 * ```
 */
