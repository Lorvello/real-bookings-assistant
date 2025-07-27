export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

export const COMPREHENSIVE_TIMEZONES: TimezoneOption[] = [
  // Europe
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)', offset: '+01:00' },
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', offset: '+01:00' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', offset: '+01:00' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)', offset: '+01:00' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)', offset: '+01:00' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)', offset: '+01:00' },
  { value: 'Europe/Brussels', label: 'Brussels (CET/CEST)', offset: '+01:00' },
  { value: 'Europe/Vienna', label: 'Vienna (CET/CEST)', offset: '+01:00' },
  { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)', offset: '+01:00' },
  
  // Americas
  { value: 'America/New_York', label: 'New York (EST/EDT)', offset: '-05:00' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)', offset: '-08:00' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)', offset: '-06:00' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)', offset: '-07:00' },
  { value: 'America/Toronto', label: 'Toronto (EST/EDT)', offset: '-05:00' },
  { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)', offset: '-08:00' },
  { value: 'America/Mexico_City', label: 'Mexico City (CST/CDT)', offset: '-06:00' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)', offset: '-03:00' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)', offset: '-03:00' },
  
  // Asia Pacific
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: '+08:00' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: '+08:00' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00' },
  { value: 'Asia/Mumbai', label: 'Mumbai (IST)', offset: '+05:30' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', offset: '+09:00' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', offset: '+07:00' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', offset: '+10:00' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)', offset: '+10:00' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)', offset: '+12:00' },
  
  // Africa & Middle East
  { value: 'Africa/Cairo', label: 'Cairo (EET)', offset: '+02:00' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)', offset: '+02:00' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)', offset: '+01:00' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem (IST)', offset: '+02:00' },
  { value: 'Asia/Riyadh', label: 'Riyadh (AST)', offset: '+03:00' },
  
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
];