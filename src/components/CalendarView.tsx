
import { CalendarContainer } from './calendar/CalendarContainer';

interface CalendarViewProps {
  calendarIds: string[];
}

export function CalendarView({ calendarIds }: CalendarViewProps) {
  return <CalendarContainer calendarIds={calendarIds} />;
}
