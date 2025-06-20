
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { BusinessType } from '@/types/database';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    phone: '',
    business_name: '',
    business_type: '' as BusinessType | '',
  });

  const [calendarSettings, setCalendarSettings] = useState({
    booking_window_days: 60,
    minimum_notice_hours: 24,
    slot_duration: 30,
    buffer_time: 0,
    max_bookings_per_day: null as number | null,
  });

  const [whatsappSettings, setWhatsappSettings] = useState({
    welcome_message: '',
    auto_reminders: true,
  });

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile && user) {
      setUserData({
        full_name: profile.full_name || '',
        email: user.email || '',
        phone: profile.phone || '',
        business_name: profile.business_name || '',
        business_type: (profile.business_type as BusinessType) || '',
      });
      fetchCalendarSettings();
    }
  }, [profile, user]);

  const fetchCalendarSettings = async () => {
    if (!user) return;
    
    try {
      // First get the user's calendar
      const { data: calendars, error: calendarError } = await supabase
        .from('calendars')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (calendarError || !calendars || calendars.length === 0) {
        console.log('No calendar found');
        return;
      }

      const calendarId = calendars[0].id;

      // Get calendar settings
      const { data: settings, error: settingsError } = await supabase
        .from('calendar_settings')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();

      if (settingsError) {
        console.error('Error fetching calendar settings:', settingsError);
        return;
      }

      if (settings) {
        setCalendarSettings({
          booking_window_days: settings.booking_window_days || 60,
          minimum_notice_hours: settings.minimum_notice_hours || 24,
          slot_duration: settings.slot_duration || 30,
          buffer_time: settings.buffer_time || 0,
          max_bookings_per_day: settings.max_bookings_per_day,
        });
      }
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await updateProfile({
        full_name: userData.full_name,
        phone: userData.phone,
        business_name: userData.business_name,
        business_type: userData.business_type,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCalendarSettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get the user's calendar
      const { data: calendars, error: calendarError } = await supabase
        .from('calendars')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (calendarError || !calendars || calendars.length === 0) {
        toast({
          title: "Error",
          description: "Calendar not found",
          variant: "destructive",
        });
        return;
      }

      const calendarId = calendars[0].id;

      const { error } = await supabase
        .from('calendar_settings')
        .update({
          booking_window_days: calendarSettings.booking_window_days,
          minimum_notice_hours: calendarSettings.minimum_notice_hours,
          slot_duration: calendarSettings.slot_duration,
          buffer_time: calendarSettings.buffer_time,
          max_bookings_per_day: calendarSettings.max_bookings_per_day,
        })
        .eq('calendar_id', calendarId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Calendar settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating calendar settings:', error);
      toast({
        title: "Error",
        description: "Failed to update calendar settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWhatsAppSettings = async () => {
    setLoading(true);
    try {
      // This would integrate with WhatsApp API in a real implementation
      // For now, just show success message
      toast({
        title: "Success",
        description: "WhatsApp settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating WhatsApp settings:', error);
      toast({
        title: "Error",
        description: "Failed to update WhatsApp settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-900 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Instellingen</h1>
          <p className="text-gray-400 mt-1">Beheer je account en bedrijfsinstellingen</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              Profiel
            </button>
            <button
              onClick={() => setActiveTab('business')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'business'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              Bedrijf
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'calendar'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              Kalender
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'whatsapp'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              WhatsApp
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl">
          {activeTab === 'profile' && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-6">Profiel Informatie</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Volledige Naam
                  </label>
                  <input
                    type="text"
                    value={userData.full_name}
                    onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userData.email}
                    disabled
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 cursor-not-allowed"
                  />
                  <p className="text-sm text-gray-500 mt-1">Email address cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telefoonnummer
                  </label>
                  <input
                    type="tel"
                    value={userData.phone}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    placeholder="+31 6 12345678"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Opslaan...' : 'Profiel Opslaan'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-6">Bedrijfsinformatie</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bedrijfsnaam
                  </label>
                  <input
                    type="text"
                    value={userData.business_name}
                    onChange={(e) => setUserData({ ...userData, business_name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type Bedrijf
                  </label>
                  <select
                    value={userData.business_type}
                    onChange={(e) => setUserData({ ...userData, business_type: e.target.value as BusinessType })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  >
                    <option value="">Selecteer type</option>
                    <option value="salon">Kapsalon</option>
                    <option value="clinic">Kliniek</option>
                    <option value="consultant">Consultant</option>
                    <option value="trainer">Trainer</option>
                    <option value="other">Anders</option>
                  </select>
                </div>

                <button
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Opslaan...' : 'Bedrijfsinformatie Opslaan'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-6">Kalender Instellingen</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hoe ver vooruit kunnen klanten boeken?
                  </label>
                  <select
                    value={calendarSettings.booking_window_days}
                    onChange={(e) => setCalendarSettings({ 
                      ...calendarSettings, 
                      booking_window_days: parseInt(e.target.value) 
                    })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  >
                    <option value="7">1 week</option>
                    <option value="14">2 weken</option>
                    <option value="30">1 maand</option>
                    <option value="60">2 maanden</option>
                    <option value="90">3 maanden</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Minimale tijd voor boeking
                  </label>
                  <select
                    value={calendarSettings.minimum_notice_hours}
                    onChange={(e) => setCalendarSettings({ 
                      ...calendarSettings, 
                      minimum_notice_hours: parseInt(e.target.value) 
                    })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  >
                    <option value="0">Direct beschikbaar</option>
                    <option value="1">1 uur van tevoren</option>
                    <option value="24">24 uur van tevoren</option>
                    <option value="48">48 uur van tevoren</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Standaard afspraak duur (minuten)
                  </label>
                  <input
                    type="number"
                    value={calendarSettings.slot_duration}
                    onChange={(e) => setCalendarSettings({ 
                      ...calendarSettings, 
                      slot_duration: parseInt(e.target.value) 
                    })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Buffer tijd tussen afspraken (minuten)
                  </label>
                  <input
                    type="number"
                    value={calendarSettings.buffer_time}
                    onChange={(e) => setCalendarSettings({ 
                      ...calendarSettings, 
                      buffer_time: parseInt(e.target.value) 
                    })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  />
                </div>

                <button 
                  onClick={handleUpdateCalendarSettings}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Opslaan...' : 'Kalender Instellingen Opslaan'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-6">WhatsApp Integratie</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">WhatsApp Business API</h3>
                    <p className="text-sm text-gray-400">Automatische berichten en booking confirmaties</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400">Verbonden</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Welkomstbericht
                  </label>
                  <textarea
                    rows={4}
                    value={whatsappSettings.welcome_message}
                    onChange={(e) => setWhatsappSettings({ ...whatsappSettings, welcome_message: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="Hallo! Welkom bij {business_name}. Ik help je graag met het maken van een afspraak."
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                  <div>
                    <h3 className="text-white font-medium">Automatische Herinneringen</h3>
                    <p className="text-sm text-gray-400">Stuur reminders 24 uur voor afspraak</p>
                  </div>
                  <button 
                    onClick={() => setWhatsappSettings({ ...whatsappSettings, auto_reminders: !whatsappSettings.auto_reminders })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      whatsappSettings.auto_reminders ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      whatsappSettings.auto_reminders ? 'translate-x-6' : 'translate-x-1'
                    }`}></span>
                  </button>
                </div>

                <button 
                  onClick={handleUpdateWhatsAppSettings}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Opslaan...' : 'WhatsApp Instellingen Opslaan'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
