
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit2, Check, X } from 'lucide-react';
import { CalendarSettings } from '@/types/database';

interface CalendarBasicSettingsProps {
  settings: CalendarSettings;
  onUpdate: (updates: Partial<CalendarSettings>) => void;
  calendarName?: string;
  onUpdateCalendarName?: (name: string) => void;
}

export function CalendarBasicSettings({ 
  settings, 
  onUpdate, 
  calendarName, 
  onUpdateCalendarName 
}: CalendarBasicSettingsProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(calendarName || '');

  const handleSaveName = () => {
    if (onUpdateCalendarName && tempName.trim()) {
      onUpdateCalendarName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    setTempName(calendarName || '');
    setIsEditingName(false);
  };

  return (
    <div className="space-y-6">
      {/* Calendar Name Section */}
      {calendarName && onUpdateCalendarName && (
        <div className="space-y-2">
          <Label className="text-foreground font-medium">Kalender Naam</Label>
          <div className="flex items-center space-x-2">
            {isEditingName ? (
              <>
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Voer kalendernaam in"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={!tempName.trim()}
                  className="px-3"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="px-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1 px-3 py-2 border rounded-md bg-muted text-foreground">
                  {calendarName}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTempName(calendarName);
                    setIsEditingName(true);
                  }}
                  className="px-3"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            De naam van je kalender zoals deze wordt weergegeven
          </p>
        </div>
      )}

      <div className="flex items-center justify-between opacity-50">
        <div className="space-y-1">
          <Label className="text-foreground font-medium">Confirmation Required</Label>
          <p className="text-sm text-muted-foreground">
            Handmatige bevestiging is uitgeschakeld - alle boekingen worden automatisch bevestigd
          </p>
        </div>
        <Switch
          checked={false}
          disabled={true}
          onCheckedChange={() => {}}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-foreground font-medium">Allow Waitlist</Label>
          <p className="text-sm text-muted-foreground">
            Allow customers to join waitlist when no slots are available
          </p>
        </div>
        <Switch
          checked={settings.allow_waitlist ?? false}
          onCheckedChange={(checked) => onUpdate({ allow_waitlist: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-foreground font-medium">WhatsApp Bot Active</Label>
          <p className="text-sm text-muted-foreground">
            Enable automated WhatsApp booking assistant
          </p>
        </div>
        <Switch
          checked={settings.whatsapp_bot_active ?? false}
          onCheckedChange={(checked) => onUpdate({ whatsapp_bot_active: checked })}
        />
      </div>
    </div>
  );
}
