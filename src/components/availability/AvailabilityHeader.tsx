
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save } from 'lucide-react';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { useCalendarContext } from '@/contexts/CalendarContext';

interface AvailabilityHeaderProps {
  setToDefault: boolean;
  onSetToDefaultChange: (value: boolean) => void;
  hasUnsavedChanges: boolean;
  loading: boolean;
  onSave: () => void;
}

export const AvailabilityHeader: React.FC<AvailabilityHeaderProps> = ({
  setToDefault,
  onSetToDefaultChange,
  hasUnsavedChanges,
  loading,
  onSave
}) => {
  const navigate = useNavigate();
  const { viewingAllCalendars } = useCalendarContext();

  return (
    <div className="border-b border-border bg-card/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground rounded-2xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <h1 className="text-xl font-semibold text-foreground">Manage Availability</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {!viewingAllCalendars && (
              <CalendarSwitcher hideAllCalendarsOption={true} />
            )}
            
            <div className="flex items-center space-x-2 bg-background/50 px-4 py-2 rounded-2xl border border-border/60">
              <span className="text-sm text-muted-foreground">Set as default</span>
              <Switch
                checked={setToDefault}
                onCheckedChange={onSetToDefaultChange}
              />
            </div>
            
            <Button 
              onClick={onSave}
              disabled={!hasUnsavedChanges || loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg shadow-primary/20"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
