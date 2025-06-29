
import { CalendarSettings } from '@/types/database';

export interface CalendarSettingsState {
  settings: CalendarSettings | null;
  pendingChanges: Partial<CalendarSettings>;
  loading: boolean;
  saving: boolean;
  hasPendingChanges: boolean;
}

export interface CalendarSettingsActions {
  updatePendingSettings: (updates: Partial<CalendarSettings>) => void;
  updateCalendarName: (newName: string) => Promise<boolean>;
  saveAllChanges: () => Promise<boolean>;
  refetch: () => void;
}
