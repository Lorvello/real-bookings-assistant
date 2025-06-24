
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CalendarSettings } from '@/types/database';

interface CalendarBasicSettingsProps {
  settings: CalendarSettings;
  onUpdate: (updates: Partial<CalendarSettings>) => void;
}

export function CalendarBasicSettings({ settings, onUpdate }: CalendarBasicSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-foreground font-medium">Confirmation Required</Label>
          <p className="text-sm text-muted-foreground">
            Require manual confirmation for new bookings
          </p>
        </div>
        <Switch
          checked={settings.confirmation_required ?? true}
          onCheckedChange={(checked) => onUpdate({ confirmation_required: checked })}
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
