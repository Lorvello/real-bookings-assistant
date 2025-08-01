
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Clock, Shield, Calendar, Zap } from 'lucide-react';

interface AdvancedSettingsProps {
  settings: any;
  onChange: (settings: any) => void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ 
  settings, 
  onChange 
}) => {
  const updateSetting = (key: string, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-8">
      {/* Buffer Time Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium text-foreground">Buffer Tijden</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="bufferBefore">Voor de afspraak</Label>
            <Select 
              value={settings?.buffer_before?.toString() || '0'}
              onValueChange={(value) => updateSetting('buffer_before', parseInt(value))}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecteer buffertijd" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="0">Geen buffertijd</SelectItem>
                <SelectItem value="5">5 minuten</SelectItem>
                <SelectItem value="10">10 minuten</SelectItem>
                <SelectItem value="15">15 minuten</SelectItem>
                <SelectItem value="30">30 minuten</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tijd voor voorbereiding tussen afspraken
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bufferAfter">Na de afspraak</Label>
            <Select 
              value={settings?.buffer_after?.toString() || '0'}
              onValueChange={(value) => updateSetting('buffer_after', parseInt(value))}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecteer buffertijd" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="0">Geen buffertijd</SelectItem>
                <SelectItem value="5">5 minuten</SelectItem>
                <SelectItem value="10">10 minuten</SelectItem>
                <SelectItem value="15">15 minuten</SelectItem>
                <SelectItem value="30">30 minuten</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tijd voor afronden na afspraken
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Booking Constraints */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium text-foreground">Boekingsbeperkingen</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="minimumNotice">Minimum notice</Label>
            <div className="flex space-x-2">
              <Input
                id="minimumNotice"
                type="number"
                min="0"
                value={settings?.minimum_notice_value || 2}
                onChange={(e) => updateSetting('minimum_notice_value', parseInt(e.target.value))}
                className="bg-background border-border"
              />
              <Select 
                value={settings?.minimum_notice_unit || 'hours'}
                onValueChange={(value) => updateSetting('minimum_notice_unit', value)}
              >
                <SelectTrigger className="w-32 bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="minutes">Minuten</SelectItem>
                  <SelectItem value="hours">Uren</SelectItem>
                  <SelectItem value="days">Dagen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimale tijd voordat een afspraak geboekt kan worden
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="timeSlots">Time-slot intervals</Label>
            <Select 
              value={settings?.slot_type || 'fixed'}
              onValueChange={(value) => updateSetting('slot_type', value)}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecteer slot type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="fixed">Vaste lengtes (30 min)</SelectItem>
                <SelectItem value="15min">15 minuten intervals</SelectItem>
                <SelectItem value="60min">60 minuten intervals</SelectItem>
                <SelectItem value="dynamic">Dynamisch per event</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Hoe tijdslots worden berekend en getoond
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Advanced Toggles */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium text-foreground">Geavanceerde Opties</h3>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Limit booking frequency</Label>
                <Badge variant="secondary" className="text-xs">Pro</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Beperk hoe vaak klanten per dag/week kunnen boeken
              </p>
            </div>
            <Switch
              checked={settings?.limit_frequency || false}
              onCheckedChange={(checked) => updateSetting('limit_frequency', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Only show first slot per day</Label>
                <Badge variant="outline" className="text-xs">Focus</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Toon alleen het eerste beschikbare tijdslot van elke dag
              </p>
            </div>
            <Switch
              checked={settings?.first_slot_only || false}
              onCheckedChange={(checked) => updateSetting('first_slot_only', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Limit total booking duration</Label>
                <Badge variant="secondary" className="text-xs">Time</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Stel een maximum in voor totale geboekte tijd per periode
              </p>
            </div>
            <Switch
              checked={settings?.limit_duration || false}
              onCheckedChange={(checked) => updateSetting('limit_duration', checked)}
            />
          </div>

          {settings?.limit_duration && (
            <div className="ml-4 p-4 rounded-lg bg-background/50 border border-border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maximum uren per dag</Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={settings?.max_hours_per_day || 8}
                    onChange={(e) => updateSetting('max_hours_per_day', parseInt(e.target.value))}
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum uren per week</Label>
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    value={settings?.max_hours_per_week || 40}
                    onChange={(e) => updateSetting('max_hours_per_week', parseInt(e.target.value))}
                    className="bg-background border-border"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
