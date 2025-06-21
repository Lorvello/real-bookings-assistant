
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Copy, Clock, Sun, Moon } from 'lucide-react';

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
  { key: 'monday', label: 'Maandag', short: 'Ma', color: 'from-blue-500 to-blue-600' },
  { key: 'tuesday', label: 'Dinsdag', short: 'Di', color: 'from-indigo-500 to-indigo-600' },
  { key: 'wednesday', label: 'Woensdag', short: 'Wo', color: 'from-purple-500 to-purple-600' },
  { key: 'thursday', label: 'Donderdag', short: 'Do', color: 'from-pink-500 to-pink-600' },
  { key: 'friday', label: 'Vrijdag', short: 'Vr', color: 'from-red-500 to-red-600' },
  { key: 'saturday', label: 'Zaterdag', short: 'Za', color: 'from-orange-500 to-orange-600' },
  { key: 'sunday', label: 'Zondag', short: 'Zo', color: 'from-amber-500 to-amber-600' }
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

  const getTimeIcon = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 6 && hour < 18) return <Sun className="h-3 w-3 text-amber-500" />;
    return <Moon className="h-3 w-3 text-blue-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {DAYS.map((day) => {
          const dayAvailability = availability[day.key];
          const isWeekend = ['saturday', 'sunday'].includes(day.key);
          
          return (
            <Card key={day.key} className={`border-border/50 transition-all duration-300 hover:shadow-lg ${
              dayAvailability.enabled 
                ? 'bg-gradient-to-br from-card to-card/80 shadow-md' 
                : 'bg-gradient-to-br from-muted/30 to-muted/10'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 bg-gradient-to-r ${day.color} rounded-xl shadow-lg transform transition-transform hover:scale-105`}>
                      <Badge variant="outline" className="bg-white/90 text-gray-800 font-bold border-0 text-sm min-w-[35px] justify-center">
                        {day.short}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-lg font-semibold text-foreground">
                        {day.label}
                      </Label>
                      {isWeekend && (
                        <p className="text-xs text-muted-foreground">Weekend</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {dayAvailability.enabled && (
                      <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                        Actief
                      </Badge>
                    )}
                    <Switch
                      checked={dayAvailability.enabled}
                      onCheckedChange={(enabled) => updateDayEnabled(day.key, enabled)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                {dayAvailability.enabled && (
                  <div className="space-y-4">
                    {dayAvailability.timeBlocks.map((block, index) => (
                      <div key={block.id} className="group p-4 bg-gradient-to-r from-background/50 to-background/30 rounded-xl border border-border/30 hover:border-primary/30 transition-all duration-200 hover:shadow-md">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="relative">
                              {getTimeIcon(block.startTime)}
                              <Input
                                type="time"
                                value={block.startTime}
                                onChange={(e) => updateTimeBlock(day.key, block.id, 'startTime', e.target.value)}
                                className="w-32 bg-background/80 border-border/50 focus:border-primary/50 text-center font-medium"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-px w-4 bg-gradient-to-r from-primary to-secondary"></div>
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div className="h-px w-4 bg-gradient-to-r from-secondary to-primary"></div>
                            </div>
                            <div className="relative">
                              {getTimeIcon(block.endTime)}
                              <Input
                                type="time"
                                value={block.endTime}
                                onChange={(e) => updateTimeBlock(day.key, block.id, 'endTime', e.target.value)}
                                className="w-32 bg-background/80 border-border/50 focus:border-primary/50 text-center font-medium"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => duplicateTimeBlock(day.key, block.id)}
                              className="h-9 w-9 p-0 hover:bg-primary/10 hover:border-primary/30"
                              title="Dupliceer tijdsblok"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            
                            {dayAvailability.timeBlocks.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeTimeBlock(day.key, block.id)}
                                className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                                title="Verwijder tijdsblok"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addTimeBlock(day.key)}
                      className="w-full border-dashed border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5 text-primary transition-all duration-200 group"
                    >
                      <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                      Tijdsblok Toevoegen
                    </Button>
                  </div>
                )}

                {!dayAvailability.enabled && (
                  <div className="text-center py-6 space-y-2">
                    <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Niet beschikbaar</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
