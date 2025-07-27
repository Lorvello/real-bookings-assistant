export interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
}

export interface DayAvailability {
  enabled: boolean;
  timeBlocks: TimeBlock[];
}

export interface WeeklySchedule {
  [key: string]: DayAvailability;
}

export interface AvailabilityRule {
  id: string;
  schedule_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
}

export interface AvailabilitySchedule {
  id: string;
  calendar_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  rules?: AvailabilityRule[];
}

export interface AvailabilityOverride {
  id: string;
  calendar_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  is_available: boolean;
  reason?: string;
  created_at: string;
}

export interface AvailabilityState {
  schedule: AvailabilitySchedule | null;
  weeklySchedule: WeeklySchedule;
  overrides: AvailabilityOverride[];
  timezone: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', index: 1, isWeekend: false },
  { key: 'tuesday', label: 'Tuesday', index: 2, isWeekend: false },
  { key: 'wednesday', label: 'Wednesday', index: 3, isWeekend: false },
  { key: 'thursday', label: 'Thursday', index: 4, isWeekend: false },
  { key: 'friday', label: 'Friday', index: 5, isWeekend: false },
  { key: 'saturday', label: 'Saturday', index: 6, isWeekend: true },
  { key: 'sunday', label: 'Sunday', index: 7, isWeekend: true },
] as const;

export type DayKey = typeof DAYS_OF_WEEK[number]['key'];