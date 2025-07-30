import { useCallback } from 'react';

interface CalendarSelection {
  savedViewingAll: boolean;
  savedCalendarId: string | null;
}

export const useCalendarPersistence = () => {
  const saveSelection = useCallback((calendarId: string | null, viewingAll: boolean) => {
    if (viewingAll) {
      localStorage.setItem('viewingAllCalendars', 'true');
      localStorage.removeItem('selectedCalendarId');
    } else if (calendarId) {
      localStorage.setItem('selectedCalendarId', calendarId);
      localStorage.removeItem('viewingAllCalendars');
    }
  }, []);

  const loadSelection = useCallback((): CalendarSelection => {
    const savedViewingAll = localStorage.getItem('viewingAllCalendars') === 'true';
    const savedCalendarId = localStorage.getItem('selectedCalendarId');
    
    return {
      savedViewingAll,
      savedCalendarId
    };
  }, []);

  const clearSelection = useCallback(() => {
    localStorage.removeItem('viewingAllCalendars');
    localStorage.removeItem('selectedCalendarId');
  }, []);

  return {
    saveSelection,
    loadSelection,
    clearSelection
  };
};