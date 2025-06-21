
import React, { useState } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, ChevronDown, Plus, User } from 'lucide-react';
import { useCreateCalendar } from '@/hooks/useCreateCalendar';

export function CalendarSwitcher() {
  const { selectedCalendar, calendars, selectCalendar, loading } = useCalendarContext();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCalendar, setNewCalendar] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const { createCalendar, loading: creating } = useCreateCalendar();

  // Generate a better default calendar name
  const generateCalendarName = () => {
    if (profile?.business_name) {
      return `${profile.business_name} Planning`;
    }
    const userName = profile?.full_name?.split(' ')[0] || 'Jouw';
    return `${userName} Planning`;
  };

  const handleCreateCalendar = async () => {
    if (!newCalendar.name.trim()) return;

    try {
      await createCalendar({
        name: newCalendar.name,
        description: newCalendar.description,
        color: newCalendar.color
      });
      
      setNewCalendar({ name: '', description: '', color: '#3B82F6' });
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating calendar:', error);
    }
  };

  // Helper function to display calendar name with better naming
  const getDisplayName = (calendar: any) => {
    // If it's the default "Mijn Kalender", suggest a better name
    if (calendar.name === 'Mijn Kalender' && profile) {
      if (profile.business_name) {
        return `${profile.business_name} Planning`;
      }
      const firstName = profile.full_name?.split(' ')[0] || 'Jouw';
      return `${firstName} Planning`;
    }
    return calendar.name;
  };

  if (loading) {
    return (
      <Card className="w-64">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
            <div className="w-32 h-4 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {/* User Context - Simplified */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
        <User className="h-4 w-4" />
        <span>{profile?.full_name || user?.email}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-between min-w-[200px] bg-white border-gray-300">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedCalendar?.color || '#3B82F6' }}
              />
              <span className="truncate">
                {selectedCalendar ? getDisplayName(selectedCalendar) : 'Selecteer kalender'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80 bg-white border-gray-200">
          <DropdownMenuLabel className="flex items-center space-x-2 text-gray-700">
            <Calendar className="h-4 w-4" />
            <span>Jouw Kalenders</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {calendars.map((calendar) => (
            <DropdownMenuItem
              key={calendar.id}
              onClick={() => selectCalendar(calendar)}
              className="flex items-center space-x-3 p-3 hover:bg-gray-50"
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: calendar.color || '#3B82F6' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium truncate text-gray-900">
                    {getDisplayName(calendar)}
                  </span>
                  {calendar.is_default && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      Hoofdkalender
                    </Badge>
                  )}
                </div>
                {calendar.description && (
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {calendar.description}
                  </p>
                )}
              </div>
              {selectedCalendar?.id === calendar.id && (
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-blue-600 hover:bg-blue-50">
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe kalender
              </DropdownMenuItem>
            </DialogTrigger>
            
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Nieuwe kalender aanmaken</DialogTitle>
                <DialogDescription>
                  Maak een nieuwe kalender om je afspraken te organiseren.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="calendar-name">Kalendernaam</Label>
                  <Input
                    id="calendar-name"
                    placeholder={generateCalendarName()}
                    value={newCalendar.name}
                    onChange={(e) => setNewCalendar(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-white border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Suggestie: {generateCalendarName()}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="calendar-description">Beschrijving (optioneel)</Label>
                  <Textarea
                    id="calendar-description"
                    placeholder="Beschrijf waar deze kalender voor is..."
                    value={newCalendar.description}
                    onChange={(e) => setNewCalendar(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-white border-gray-300"
                  />
                </div>
                
                <div>
                  <Label htmlFor="calendar-color">Kleur</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="color"
                      id="calendar-color"
                      value={newCalendar.color}
                      onChange={(e) => setNewCalendar(prev => ({ ...prev, color: e.target.value }))}
                      className="w-8 h-8 rounded border border-gray-300"
                    />
                    <span className="text-sm text-gray-600">{newCalendar.color}</span>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuleren
                </Button>
                <Button 
                  onClick={handleCreateCalendar}
                  disabled={!newCalendar.name.trim() || creating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {creating ? 'Aanmaken...' : 'Kalender aanmaken'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
