
import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CalendarSettings } from '@/types/database';

interface CalendarRequiredFieldsProps {
  settings: CalendarSettings;
  onUpdate: (updates: Partial<CalendarSettings>) => void;
}

export function CalendarRequiredFields({ settings, onUpdate }: CalendarRequiredFieldsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base">WhatsApp Bot</Label>
          <div className="text-sm text-muted-foreground">
            Activeer automatische WhatsApp berichten en booking assistentie
          </div>
        </div>
        <Switch
          checked={settings.whatsapp_bot_active || false}
          onCheckedChange={(checked) => onUpdate({ whatsapp_bot_active: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base">Bevestiging vereist</Label>
          <div className="text-sm text-muted-foreground">
            Nieuwe boekingen hebben handmatige bevestiging nodig
          </div>
        </div>
        <Switch
          checked={settings.confirmation_required}
          onCheckedChange={(checked) => onUpdate({ confirmation_required: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base">Wachtlijst toestaan</Label>
          <div className="text-sm text-muted-foreground">
            Klanten kunnen zich inschrijven voor wachtlijst bij volle agenda
          </div>
        </div>
        <Switch
          checked={settings.allow_waitlist}
          onCheckedChange={(checked) => onUpdate({ allow_waitlist: checked })}
        />
      </div>
    </div>
  );
}
