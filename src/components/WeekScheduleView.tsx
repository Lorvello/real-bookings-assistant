
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Clock,
  GripVertical,
  Copy
} from 'lucide-react';
import { AvailabilityRule } from '@/types/database';
import { TimeBlockEditor } from './TimeBlockEditor';

interface WeekScheduleViewProps {
  calendarId: string;
  scheduleId: string;
  rules: AvailabilityRule[];
  onRuleUpdate: (id: string, updates: Partial<AvailabilityRule>) => Promise<void>;
  onRuleCreate: (rule: Partial<AvailabilityRule>) => Promise<void>;
  onRuleDelete: (id: string) => Promise<void>;
  loading: boolean;
}

const DAYS_OF_WEEK = [
  { key: 1, label: 'Maandag', short: 'Ma' },
  { key: 2, label: 'Dinsdag', short: 'Di' },
  { key: 3, label: 'Woensdag', short: 'Wo' },
  { key: 4, label: 'Donderdag', short: 'Do' },
  { key: 5, label: 'Vrijdag', short: 'Vr' },
  { key: 6, label: 'Zaterdag', short: 'Za' },
  { key: 0, label: 'Zondag', short: 'Zo' },
];

export function WeekScheduleView({
  scheduleId,
  rules,
  onRuleUpdate,
  onRuleCreate,
  onRuleDelete,
  loading
}: WeekScheduleViewProps) {
  const [editingRule, setEditingRule] = useState<string | null>(null);

  const getRuleForDay = (dayOfWeek: number) => {
    return rules.find(rule => rule.day_of_week === dayOfWeek);
  };

  const handleToggleDay = async (dayOfWeek: number, isAvailable: boolean) => {
    const existingRule = getRuleForDay(dayOfWeek);
    
    if (existingRule) {
      await onRuleUpdate(existingRule.id, { is_available: isAvailable });
    } else {
      await onRuleCreate({
        day_of_week: dayOfWeek,
        start_time: '09:00',
        end_time: '17:00',
        is_available: isAvailable
      });
    }
  };

  const handleTimeUpdate = async (dayOfWeek: number, startTime: string, endTime: string) => {
    const existingRule = getRuleForDay(dayOfWeek);
    
    if (existingRule) {
      await onRuleUpdate(existingRule.id, { 
        start_time: startTime, 
        end_time: endTime 
      });
    } else {
      await onRuleCreate({
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_available: true
      });
    }
  };

  const handleCopyDay = (fromDay: number, toDay: number) => {
    const sourceRule = getRuleForDay(fromDay);
    if (!sourceRule) return;

    handleTimeUpdate(toDay, sourceRule.start_time, sourceRule.end_time);
    handleToggleDay(toDay, sourceRule.is_available);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 bg-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-background-secondary rounded-lg p-6 border border-border">
        <h3 className="text-lg font-medium text-foreground mb-6 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Werkuren per dag
        </h3>

        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const rule = getRuleForDay(day.key);
            const isAvailable = rule?.is_available || false;
            const startTime = rule?.start_time || '09:00';
            const endTime = rule?.end_time || '17:00';

            return (
              <div
                key={day.key}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  isAvailable 
                    ? 'bg-card border-primary/20 hover:border-primary/40' 
                    : 'bg-muted border-border hover:border-border'
                }`}
              >
                {/* Day Label & Toggle */}
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <div className="flex items-center space-x-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{day.label}</div>
                      <div className="text-sm text-muted-foreground">{day.short}</div>
                    </div>
                  </div>

                  <Switch
                    checked={isAvailable}
                    onCheckedChange={(checked) => handleToggleDay(day.key, checked)}
                    className="data-[state=checked]:bg-primary"
                  />

                  {isAvailable && (
                    <Badge variant="default" className="bg-primary/10 text-primary">
                      Beschikbaar
                    </Badge>
                  )}
                </div>

                {/* Time Controls */}
                {isAvailable && (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm text-muted-foreground">Van:</Label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => handleTimeUpdate(day.key, e.target.value, endTime)}
                        className="w-24 bg-input border-border"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Label className="text-sm text-muted-foreground">Tot:</Label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => handleTimeUpdate(day.key, startTime, e.target.value)}
                        className="w-24 bg-input border-border"
                      />
                    </div>

                    {/* Copy Day Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Simple copy to next day logic
                        const nextDayKey = day.key === 0 ? 1 : (day.key + 1) % 7;
                        handleCopyDay(day.key, nextDayKey);
                      }}
                      className="p-2"
                      title="Kopieer naar volgende dag"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Delete Rule */}
                {rule && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRuleDelete(rule.id)}
                    className="p-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                DAYS_OF_WEEK.slice(0, 5).forEach(day => {
                  handleToggleDay(day.key, true);
                  handleTimeUpdate(day.key, '09:00', '17:00');
                });
              }}
              className="border-border"
            >
              Ma-Vr 9:00-17:00
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                DAYS_OF_WEEK.forEach(day => {
                  handleToggleDay(day.key, true);
                  handleTimeUpdate(day.key, '08:00', '18:00');
                });
              }}
              className="border-border"
            >
              Alle dagen 8:00-18:00
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                DAYS_OF_WEEK.forEach(day => {
                  handleToggleDay(day.key, false);
                });
              }}
              className="border-border"
            >
              Alle dagen sluiten
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
