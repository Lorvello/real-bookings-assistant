
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Copy } from 'lucide-react';

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  enabled: boolean;
  timeBlocks: TimeBlock[];
}

interface DailyAvailabilityProps {
  onChange: () => void;
}

const DAYS = [
  { key: 'monday', label: 'Maandag', short: 'Ma' },
  { key: 'tuesday', label: 'Dinsdag', short: 'Di' },
  { key: 'wednesday', label: 'Woensdag', short: 'Wo' },
  { key: 'thursday', label: 'Donderdag', short: 'Do' },
  { key: 'friday', label: 'Vrijdag', short: 'Vr' },
  { key: 'saturday', label: 'Zaterdag', short: 'Za' },
  { key: 'sunday', label: 'Zondag', short: 'Zo' }
];

export const DailyAvailability: React.FC<DailyAvailabilityProps> = ({ onChange }) => {
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>(() => {
    const initial: Record<string, DayAvailability> = {};
    DAYS.forEach(day => {
      initial[day.key] = {
        enabled: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day.key),
        timeBlocks: [{
          id: `${day.key}-1`,
          startTime: '09:00',
          endTime: '17:00'
        }]
      };
    });
    return initial;
  });

  const updateDayEnabled = (dayKey: string, enabled: boolean) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], enabled }
    }));
    onChange();
  };

  const addTimeBlock = (dayKey: string) => {
    const dayAvailability = availability[dayKey];
    const lastBlock = dayAvailability.timeBlocks[dayAvailability.timeBlocks.length - 1];
    
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: [
          ...prev[dayKey].timeBlocks,
          {
            id: `${dayKey}-${Date.now()}`,
            startTime: lastBlock ? lastBlock.endTime : '09:00',
            endTime: '17:00'
          }
        ]
      }
    }));
    onChange();
  };

  const duplicateTimeBlock = (dayKey: string, blockId: string) => {
    const block = availability[dayKey].timeBlocks.find(b => b.id === blockId);
    if (!block) return;

    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: [
          ...prev[dayKey].timeBlocks,
          {
            id: `${dayKey}-${Date.now()}`,
            startTime: block.startTime,
            endTime: block.endTime
          }
        ]
      }
    }));
    onChange();
  };

  const removeTimeBlock = (dayKey: string, blockId: string) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: prev[dayKey].timeBlocks.filter(block => block.id !== blockId)
      }
    }));
    onChange();
  };

  const updateTimeBlock = (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        timeBlocks: prev[dayKey].timeBlocks.map(block =>
          block.id === blockId ? { ...block, [field]: value } : block
        )
      }
    }));
    onChange();
  };

  return (
    <div className="space-y-4">
      {DAYS.map((day) => {
        const dayAvailability = availability[day.key];
        
        return (
          <Card key={day.key} className="border-border bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="min-w-[40px] text-center">
                    {day.short}
                  </Badge>
                  <Label className="text-foreground font-medium">
                    {day.label}
                  </Label>
                </div>
                
                <Switch
                  checked={dayAvailability.enabled}
                  onCheckedChange={(enabled) => updateDayEnabled(day.key, enabled)}
                />
              </div>

              {dayAvailability.enabled && (
                <div className="space-y-3">
                  {dayAvailability.timeBlocks.map((block, index) => (
                    <div key={block.id} className="flex items-center space-x-3 p-3 bg-background/50 rounded-lg border border-border">
                      <div className="flex items-center space-x-2 flex-1">
                        <Input
                          type="time"
                          value={block.startTime}
                          onChange={(e) => updateTimeBlock(day.key, block.id, 'startTime', e.target.value)}
                          className="w-32 bg-background border-border"
                        />
                        <span className="text-muted-foreground">tot</span>
                        <Input
                          type="time"
                          value={block.endTime}
                          onChange={(e) => updateTimeBlock(day.key, block.id, 'endTime', e.target.value)}
                          className="w-32 bg-background border-border"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateTimeBlock(day.key, block.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        
                        {dayAvailability.timeBlocks.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTimeBlock(day.key, block.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeBlock(day.key)}
                    className="w-full border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tijdsblok Toevoegen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
