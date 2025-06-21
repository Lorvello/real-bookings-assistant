
import { CalendarContainer } from './calendar/CalendarContainer';

interface CalendarViewProps {
  calendarId: string;
}

export function CalendarView({ calendarId }: CalendarViewProps) {
  return <CalendarContainer calendarId={calendarId} />;
}
