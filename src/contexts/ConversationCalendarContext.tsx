
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCalendars } from '@/hooks/useCalendars';

interface ConversationCalendarContextType {
  selectedCalendarId: string | null;
  setSelectedCalendarId: (id: string | null) => void;
  calendars: any[];
  isLoading: boolean;
}

const ConversationCalendarContext = createContext<ConversationCalendarContextType | undefined>(undefined);

export function ConversationCalendarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { calendars, loading } = useCalendars();
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);

  // Auto-select first calendar when calendars load
  useEffect(() => {
    if (calendars.length > 0 && !selectedCalendarId) {
      setSelectedCalendarId(calendars[0].id);
    }
  }, [calendars, selectedCalendarId]);

  return (
    <ConversationCalendarContext.Provider
      value={{
        selectedCalendarId,
        setSelectedCalendarId,
        calendars,
        isLoading: loading,
      }}
    >
      {children}
    </ConversationCalendarContext.Provider>
  );
}

export function useConversationCalendar() {
  const context = useContext(ConversationCalendarContext);
  if (context === undefined) {
    throw new Error('useConversationCalendar must be used within a ConversationCalendarProvider');
  }
  return context;
}
