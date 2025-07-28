import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';

interface CalendarRequiredEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  showCreateButton?: boolean;
}

export function CalendarRequiredEmptyState({ 
  icon,
  title, 
  description,
  showCreateButton = true 
}: CalendarRequiredEmptyStateProps) {
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
          {icon || <Calendar className="h-8 w-8 text-muted-foreground" />}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {showCreateButton && (
          <>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Calendar
            </Button>

            <CreateCalendarDialog
              open={showCreateDialog}
              onOpenChange={setShowCreateDialog}
            />
          </>
        )}
      </div>
    </div>
  );
}