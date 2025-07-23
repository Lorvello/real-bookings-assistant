import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { CalendarSettings } from '@/types/database';
import { useQueryClient } from '@tanstack/react-query';

interface GlobalSettingsProps {
  settings: CalendarSettings;
  onUpdate: (updates: Partial<CalendarSettings>) => void;
  calendarId?: string;
}

export function GlobalSettings({ 
  settings, 
  onUpdate, 
  calendarId 
}: GlobalSettingsProps) {
  const queryClient = useQueryClient();

  const handleWhatsAppBotToggle = async (checked: boolean) => {
    // Update the setting
    onUpdate({ whatsapp_bot_active: checked });
    
    // Subtle refresh: invalidate relevant queries after a short delay
    setTimeout(() => {
      if (calendarId) {
        queryClient.invalidateQueries({ queryKey: ['bot-status', calendarId] });
        queryClient.invalidateQueries({ queryKey: ['optimized-live-operations', calendarId] });
        queryClient.invalidateQueries({ queryKey: ['user-status'] });
      }
    }, 1500); // Wait for auto-save to complete
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* WhatsApp Bot Setting - Global */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-foreground font-medium">WhatsApp Bot Active</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>When enabled, the AI assistant responds to WhatsApp messages globally across all calendars. When disabled, the bot will not reply to customer messages.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Enable automated WhatsApp booking assistant (applies to all calendars)
            </p>
          </div>
          <Switch
            checked={settings.whatsapp_bot_active ?? false}
            onCheckedChange={handleWhatsAppBotToggle}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}