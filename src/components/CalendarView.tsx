
import { CalendarContainer } from './calendar/CalendarContainer';

interface CalendarViewProps {
  calendarIds: string[];
  viewingAllCalendars?: boolean;
}

export function CalendarView({ calendarIds, viewingAllCalendars = false }: CalendarViewProps) {
  return <CalendarContainer calendarIds={calendarIds} viewingAllCalendars={viewingAllCalendars} />;
}
