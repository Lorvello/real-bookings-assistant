import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Calendar } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { CalendarConnectionManager } from '@/components/calendar/CalendarConnectionManager';
import { CalendarIntegrationModal } from '@/components/CalendarIntegrationModal';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useToast } from '@/hooks/use-toast';

/**
 * ⚙️ SETTINGS PAGE - Enhanced met Calendar Management
 * ==================================================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Uitgebreide instellingenpagina die nu ook calendar connection management bevat.
 * Biedt gebruikers een centrale plek voor account settings én calendar disconnect
 * functionaliteit zoals gevraagd in de requirements.
 * 
 * 🚀 NEW FEATURES:
 * - Integrated calendar connection management sectie
 * - Disconnect functionaliteit direct toegankelijk
 * - Account settings én calendar settings in één interface
 * - Consistent navigation en user experience
 * 
 * 🎪 SYSTEM INTEGRATION:
 * - Profile Management: Bestaande account settings
 * - Calendar Management: Nieuwe disconnect functionaliteit
 * - Navigation: Clear routing tussen dashboard en settings
 * - Toast Notifications: Consistent feedback system
 */

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    business_name: '',
    business_description: '',
    business_phone: '',
    business_address: '',
    business_website: '',
  });

  const { profile, updateProfile } = useProfile(user);
  const { connections, loading: calendarLoading, refetch: refetchCalendar } = useCalendarIntegration(user);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        business_name: profile.business_name || '',
        business_description: '',
        business_phone: '',
        business_address: '',
        business_website: '',
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    await updateProfile({
      full_name: formData.full_name,
      business_name: formData.business_name,
    });
    setSaving(false);
  };

  /**
   * 🎯 Handles successful calendar integration
   */
  const handleCalendarIntegrationComplete = () => {
    console.log('[Settings] Calendar integration completed');
    setCalendarModalOpen(false);
    
    setTimeout(() => {
      toast({
        title: "Kalender Verbonden",
        description: "Je kalender is succesvol verbonden",
      });
      refetchCalendar();
    }, 1000);
  };

  /**
   * 🔄 Handles calendar connection refresh
   */
  const handleCalendarRefresh = async () => {
    console.log('[Settings] Refreshing calendar connections');
    await refetchCalendar();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/profile')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Account Instellingen</h1>
          <p className="text-gray-600 mt-2">Beheer je account en kalender verbindingen</p>
        </div>

        <div className="grid gap-6">
          {/* 👤 PERSONAL INFORMATION - Keep existing */}
          <Card>
            <CardHeader>
              <CardTitle>Persoonlijke Informatie</CardTitle>
              <CardDescription>Update je persoonlijke gegevens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">E-mailadres</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-sm text-gray-500 mt-1">E-mailadres kan niet worden gewijzigd</p>
              </div>
              <div>
                <Label htmlFor="full_name">Volledige Naam</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Voer je volledige naam in"
                />
              </div>
            </CardContent>
          </Card>

          {/* 🏢 BUSINESS INFORMATION - Keep existing */}
          <Card>
            <CardHeader>
              <CardTitle>Bedrijfsinformatie</CardTitle>
              <CardDescription>Configureer je bedrijfsgegevens voor de booking assistent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="business_name">Bedrijfsnaam</Label>
                <Input
                  id="business_name"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  placeholder="Voer je bedrijfsnaam in"
                />
              </div>
              <div>
                <Label htmlFor="business_description">Bedrijfsbeschrijving</Label>
                <Textarea
                  id="business_description"
                  name="business_description"
                  value={formData.business_description}
                  onChange={handleInputChange}
                  placeholder="Beschrijf je bedrijf en diensten"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_phone">Bedrijfstelefoon</Label>
                  <Input
                    id="business_phone"
                    name="business_phone"
                    value={formData.business_phone}
                    onChange={handleInputChange}
                    placeholder="+31 6 12345678"
                  />
                </div>
                <div>
                  <Label htmlFor="business_website">Website</Label>
                  <Input
                    id="business_website"
                    name="business_website"
                    value={formData.business_website}
                    onChange={handleInputChange}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="business_address">Bedrijfsadres</Label>
                <Textarea
                  id="business_address"
                  name="business_address"
                  value={formData.business_address}
                  onChange={handleInputChange}
                  placeholder="Voer je bedrijfsadres in"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* 📅 NEW: CALENDAR MANAGEMENT SECTION */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-600" />
                Kalender Verbindingen
              </CardTitle>
              <CardDescription>
                Beheer je kalender koppelingen voor automatische beschikbaarheid en 24/7 booking via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarConnectionManager
                user={user}
                connections={connections}
                loading={calendarLoading}
                onRefresh={handleCalendarRefresh}
                onAddCalendar={() => setCalendarModalOpen(true)}
              />
            </CardContent>
          </Card>

          {/* 💾 SAVE BUTTON - Keep existing */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Opslaan...' : 'Wijzigingen Opslaan'}
            </Button>
          </div>
        </div>
      </div>

      {/* 📅 CALENDAR INTEGRATION MODAL */}
      <CalendarIntegrationModal
        open={calendarModalOpen}
        onOpenChange={setCalendarModalOpen}
        onComplete={handleCalendarIntegrationComplete}
      />
    </div>
  );
};

export default Settings;

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * De Settings pagina is nu uitgebreid met calendar management functionaliteit,
 * wat gebruikers een centrale plek geeft voor zowel account als kalender beheer.
 * Dit vervult de requirement voor een toegankelijke "Disconnect Google Calendar" functie.
 * 
 * KEY ADDITIONS:
 * - Calendar Connection Management sectie
 * - Integrated disconnect functionality met confirmation
 * - Clear navigation tussen account en calendar settings
 * - Consistent user experience patterns
 * 
 * USER EXPERIENCE:
 * - Single page voor alle settings reduces cognitive load
 * - Clear sectie indeling voor different functional areas
 * - Consistent button styling en interaction patterns
 * - Proper loading states en error handling
 * 
 * BUSINESS VALUE:
 * - Reduces support tickets door self-service calendar management
 * - Improves user confidence in system control
 * - Enables quick troubleshooting van connection issues
 * - Maintains system reliability door proper disconnect flows
 */
