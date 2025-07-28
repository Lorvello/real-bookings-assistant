import { useState, useEffect, useRef, useMemo } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAvailabilitySchedules } from '@/hooks/useAvailabilitySchedules';
import { useAvailabilityRules } from '@/hooks/useAvailabilityRules';

interface AvailabilityState {
  setupState: 'checking' | 'needs_calendar' | 'needs_config' | 'configured';
  configurationExists: boolean;
  isRefreshing: boolean;
  hasDefaultSchedule: boolean;
  selectedCalendar: any;
  defaultSchedule: any;
}

export const useStableAvailabilityState = () => {
  const { selectedCalendar, calendars, viewingAllCalendars } = useCalendarContext();
  const { schedules, loading: schedulesLoading } = useAvailabilitySchedules(selectedCalendar?.id);
  const defaultSchedule = schedules.find(s => s.is_default) || schedules[0];
  const { rules, loading: rulesLoading } = useAvailabilityRules(defaultSchedule?.id);

  // Cache to prevent unnecessary recalculations
  const lastConfigStateRef = useRef<string>('');

  // Initialize with intelligent state - never show wrong configuration screen
  const [state, setState] = useState<AvailabilityState>(() => {
    const hasCalendar = !!selectedCalendar && !viewingAllCalendars;
    return {
      // Smart initialization: show 'checking' if we have calendar but need to load data
      // This prevents showing "Configure" screen when user already has configuration
      setupState: hasCalendar ? 'checking' : 'needs_calendar',
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
    // Skip state computation during loading to prevent intermediate states
    if (schedulesLoading || rulesLoading) return;

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

    setState(newState);
  }, [
    selectedCalendar?.id,
    viewingAllCalendars,
    schedules.length,
    rules.length,
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