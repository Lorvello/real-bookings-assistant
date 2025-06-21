import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Plus, Trash2, Edit } from 'lucide-react';

interface DateOverride {
  id: string;
  date: string;
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

interface DateOverridesProps {
  onChange: () => void;
}

export const DateOverrides: React.FC<DateOverridesProps> = ({ onChange }) => {
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOverride, setNewOverride] = useState<Partial<DateOverride>>({
    date: '',
    enabled: false,
    startTime: '09:00',
    endTime: '17:00',
    reason: ''
  });

  const addOverride = () => {
    if (!newOverride.date) return;

    const override: DateOverride = {
      id: Date.now().toString(),
      date: newOverride.date,
      enabled: newOverride.enabled || false,
      startTime: newOverride.enabled ? newOverride.startTime : undefined,
      endTime: newOverride.enabled ? newOverride.endTime : undefined,
      reason: newOverride.reason || ''
    };

    setOverrides(prev => [...prev, override].sort((a, b) => a.date.localeCompare(b.date)));
    setNewOverride({
      date: '',
      enabled: false,
      startTime: '09:00',
      endTime: '17:00',
      reason: ''
    });
    setShowAddForm(false);
    onChange();
  };

  const removeOverride = (id: string) => {
    setOverrides(prev => prev.filter(o => o.id !== id));
    onChange();
  };

  const updateOverride = (id: string, updates: Partial<DateOverride>) => {
    setOverrides(prev => prev.map(override => 
      override.id === id ? { ...override, ...updates } : override
    ));
    onChange();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('nl-NL', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Datum Uitzonderingen
          </h3>
          <p className="text-sm text-muted-foreground">
            Stel afwijkende beschikbaarheid in voor specifieke dagen
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowAddForm(true)}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          Uitzondering Toevoegen
        </Button>
      </div>

      {/* Add New Override Form */}
      {showAddForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Nieuwe Uitzondering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  value={newOverride.date}
                  onChange={(e) => setNewOverride(prev => ({ ...prev, date: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Beschikbaar op deze dag</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newOverride.enabled}
                    onCheckedChange={(enabled) => setNewOverride(prev => ({ ...prev, enabled }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {newOverride.enabled ? 'Beschikbaar' : 'Niet beschikbaar'}
                  </span>
                </div>
              </div>
            </div>

            {newOverride.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Starttijd</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newOverride.startTime}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, startTime: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endTime">Eindtijd</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newOverride.endTime}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, endTime: e.target.value }))}
                    className="bg-background border-border"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reden (optioneel)</Label>
              <Textarea
                id="reason"
                placeholder="Bijv. vakantie, feestdag, speciale uren..."
                value={newOverride.reason}
                onChange={(e) => setNewOverride(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-background border-border"
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewOverride({
                    date: '',
                    enabled: false,
                    startTime: '09:00',
                    endTime: '17:00',
                    reason: ''
                  });
                }}
              >
                Annuleren
              </Button>
              <Button
                onClick={addOverride}
                disabled={!newOverride.date}
                className="bg-primary hover:bg-primary/90"
              >
                Toevoegen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Overrides */}
      {overrides.length > 0 && (
        <div className="space-y-3">
          {overrides.map((override) => (
            <Card key={override.id} className="border-border bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge variant={override.enabled ? "default" : "secondary"}>
                        {formatDate(override.date)}
                      </Badge>
                      <Badge variant={override.enabled ? "outline" : "destructive"}>
                        {override.enabled ? 'Beschikbaar' : 'Niet beschikbaar'}
                      </Badge>
                    </div>
                    
                    {override.enabled && override.startTime && override.endTime && (
                      <p className="text-sm text-muted-foreground">
                        {override.startTime} - {override.endTime}
                      </p>
                    )}
                    
                    {override.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {override.reason}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeOverride(override.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {overrides.length === 0 && !showAddForm && (
        <Card className="border-dashed border-border bg-card/30">
          <CardContent className="p-8 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Geen datum uitzonderingen ingesteld
            </p>
            <p className="text-sm text-muted-foreground">
              Voeg uitzonderingen toe voor vakanties, feestdagen of speciale uren
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
