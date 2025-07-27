import React from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { SimpleAvailabilityForm } from './SimpleAvailabilityForm';
import { DateOverrides } from './DateOverrides';

interface AvailabilityContentProps {
  activeTab: string;
}

export const AvailabilityContent: React.FC<AvailabilityContentProps> = ({ activeTab }) => {
  const { selectedCalendar } = useCalendarContext();

  if (activeTab === 'schedule') {
    if (!selectedCalendar) {
      return (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">Please select a calendar to manage availability.</p>
        </div>
      );
    }

    return <SimpleAvailabilityForm calendarId={selectedCalendar.id} />;
  }

  if (activeTab === 'overrides') {
    return <DateOverrides />;
  }

  return null;
};