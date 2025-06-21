
import React from 'react';
import { Calendar } from 'lucide-react';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { CreateCalendarDialog } from './CreateCalendarDialog';
import type { Calendar as CalendarType } from '@/types/database';

interface CalendarDropdownContentProps {
  calendars: CalendarType[];
  selectedCalendar: CalendarType | null;
  onSelectCalendar: (calendar: CalendarType) => void;
  showCreateDialog: boolean;
  onShowCreateDialogChange: (show: boolean) => void;
}

export function CalendarDropdownContent({ 
  calendars, 
  selectedCalendar, 
  onSelectCalendar,
  showCreateDialog,
  onShowCreateDialogChange
}: CalendarDropdownContentProps) {
  return (
    <DropdownMenuContent className="w-80">
      <DropdownMenuLabel className="flex items-center space-x-2">
        <Calendar className="h-4 w-4" />
        <span>Jouw Kalenders</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      
      {calendars.map((calendar) => (
        <DropdownMenuItem
          key={calendar.id}
          onClick={() => onSelectCalendar(calendar)}
          className="flex items-center space-x-3 p-3"
        >
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: calendar.color || '#3B82F6' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium truncate">{calendar.name}</span>
              {calendar.is_default && (
                <Badge variant="outline" className="text-xs">Standaard</Badge>
              )}
            </div>
            {calendar.description && (
              <p className="text-xs text-muted-foreground truncate">
                {calendar.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Eigenaar: Jij
            </p>
          </div>
          {selectedCalendar?.id === calendar.id && (
            <div className="w-2 h-2 bg-primary rounded-full" />
          )}
        </DropdownMenuItem>
      ))}
      
      <DropdownMenuSeparator />
      
      <CreateCalendarDialog 
        open={showCreateDialog} 
        onOpenChange={onShowCreateDialogChange}
      />
    </DropdownMenuContent>
  );
}
