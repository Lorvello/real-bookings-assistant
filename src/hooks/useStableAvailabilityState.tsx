import { useState, useEffect, useRef, useMemo } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAvailabilitySchedules } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';

// Configuration status caching utilities
const getConfigCacheKey = (calendarId: string) => `availability_configured_${calendarId}`;

const isConfigurationCached = (calendarId: string): boolean => {
  if (!calendarId) return false;
  const cached = localStorage.getItem(getConfigCacheKey(calendarId));
  return cached === 'true';
};

const cacheConfigurationStatus = (calendarId: string, isConfigured: boolean) => {
  if (!calendarId) return;
  if (isConfigured) {
    localStorage.setItem(getConfigCacheKey(calendarId), 'true');
  } else {
    localStorage.removeItem(getConfigCacheKey(calendarId));
  }
};

interface AvailabilityState {
  setupState: 'checking' | 'needs_calendar' | 'needs_config' | 'configured';
  configurationExists: boolean;
  isRefreshing: boolean;
  hasDefaultSchedule: boolean;
  selectedCalendar: any;
  defaultSchedule: any;
}

export const useStableAvailabilityState = () => {
  const { selectedCalendar, calendars, viewingAllCalendars, loading: calendarsLoading } = useCalendarContext();
  const { schedules, loading: schedulesLoading } = useAvailabilitySchedules(selectedCalendar?.id);
  const defaultSchedule = schedules.find(s => s.is_default) || schedules[0];
  const { rules, loading: rulesLoading } = useAvailabilityRules(defaultSchedule?.id);

  // Cache to prevent unnecessary recalculations
  const lastConfigStateRef = useRef<string>('');

  // Initialize with intelligent state - check cache to prevent flash
  const [state, setState] = useState<AvailabilityState>(() => {
    // Always start with 'checking' to prevent flash - we'll determine real state once data loads
    return {
      setupState: 'checking',
      configurationExists: false,
      isRefreshing: false,
      hasDefaultSchedule: false,
      selectedCalendar,
      defaultSchedule: null
    };
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Combined effect to compute state with caching
  useEffect(() => {
    // Skip state computation during ANY loading to prevent intermediate states and flash
    if (calendarsLoading || schedulesLoading || rulesLoading) return;

    const hasCalendar = !!selectedCalendar && !viewingAllCalendars;
    const hasSchedule = !!defaultSchedule;
    const hasRules = rules.length > 0;
    const isConfigured = hasCalendar && hasSchedule && hasRules;

    // Create cache key to prevent unnecessary updates
    const configKey = `${hasCalendar}-${hasSchedule}-${hasRules}-${selectedCalendar?.id}`;
    
    // Skip if state hasn't actually changed
    if (configKey === lastConfigStateRef.current && !state.isRefreshing) {
      return;
    }
    
    lastConfigStateRef.current = configKey;

    let newSetupState: AvailabilityState['setupState'];
    if (!hasCalendar) {
      newSetupState = 'needs_calendar';
    } else if (!hasSchedule || !hasRules) {
      newSetupState = 'needs_config';
    } else {
      newSetupState = 'configured';
    }

    // SINGLE state update with all computed values
    const newState: AvailabilityState = {
      setupState: newSetupState,
      configurationExists: isConfigured,
      isRefreshing: false, // Always reset refreshing state
      hasDefaultSchedule: hasSchedule,
      selectedCalendar,
      defaultSchedule
    };

    // Update cache with current configuration status
    if (hasCalendar) {
      cacheConfigurationStatus(selectedCalendar.id, isConfigured);
    }

    setState(newState);
  }, [
    selectedCalendar?.id,
    viewingAllCalendars,
    schedules.length,
    rules.length,
    calendarsLoading,
    schedulesLoading,
    rulesLoading,
    state.isRefreshing
  ]);

  // Memoized refresh function to prevent re-renders
  const refreshState = useMemo(() => ({
    setRefreshing: (refreshing: boolean) => 
      setState(prev => ({ ...prev, isRefreshing: refreshing })),
    forceCheck: () => {
      // Clear cache to force re-evaluation
      lastConfigStateRef.current = '';
      // Trigger immediate refresh without race conditions
      setState(prev => ({ ...prev, isRefreshing: true }));
    }
  }), []);

  return {
    ...state,
    ...refreshState
  };
};