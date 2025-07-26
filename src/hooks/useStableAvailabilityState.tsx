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

  // SINGLE state object to prevent cascading updates
  const [state, setState] = useState<AvailabilityState>({
    setupState: 'checking',
    configurationExists: false,
    isRefreshing: false,
    hasDefaultSchedule: false,
    selectedCalendar: null,
    defaultSchedule: null
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // OPTIMIZED: Single effect that computes final state once
  useEffect(() => {
    // Skip state computation during loading to prevent intermediate states
    if (schedulesLoading || rulesLoading) return;

    const hasCalendar = !!selectedCalendar && !viewingAllCalendars;
    const hasSchedule = !!defaultSchedule;
    const hasRules = rules.length > 0;
    const isConfigured = hasCalendar && hasSchedule && hasRules;

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
      isRefreshing: false,
      hasDefaultSchedule: hasSchedule,
      selectedCalendar,
      defaultSchedule
    };

    // Only update if state actually changed
    if (JSON.stringify(newState) !== JSON.stringify(stateRef.current)) {
      setState(newState);
    }
  }, [
    selectedCalendar?.id,
    viewingAllCalendars,
    schedules.length,
    rules.length,
    schedulesLoading,
    rulesLoading
  ]);

  // Memoized refresh function to prevent re-renders
  const refreshState = useMemo(() => ({
    setRefreshing: (refreshing: boolean) => 
      setState(prev => ({ ...prev, isRefreshing: refreshing })),
    forceCheck: () => 
      setState(prev => ({ ...prev, setupState: 'checking' }))
  }), []);

  return {
    ...state,
    ...refreshState
  };
};