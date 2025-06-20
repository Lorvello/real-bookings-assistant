import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { BusinessType } from '@/types/database';
import { X } from 'lucide-react';
import Select from 'react-select';

// Uitgebreide lijst van bedrijfstypes
const businessTypes = [
  // Beauty & Wellness
  { value: 'hair_salon', label: 'Kapsalon' },
  { value: 'barber', label: 'Barbershop' },
  { value: 'nail_salon', label: 'Nagelsalon' },
  { value: 'beauty_salon', label: 'Schoonheidssalon' },
  { value: 'spa', label: 'Spa & Wellness' },
  { value: 'massage', label: 'Massage Therapie' },
  { value: 'tattoo', label: 'Tattoo Shop' },
  { value: 'piercing', label: 'Piercing Studio' },
  { value: 'makeup', label: 'Make-up Artist' },
  { value: 'lashes', label: 'Wimper Specialist' },
  { value: 'brows', label: 'Wenkbrauw Specialist' },
  
  // Gezondheid & Medisch
  { value: 'dentist', label: 'Tandarts' },
  { value: 'doctor', label: 'Huisarts' },
  { value: 'specialist', label: 'Medisch Specialist' },
  { value: 'physiotherapy', label: 'Fysiotherapie' },
  { value: 'psychology', label: 'Psycholoog' },
  { value: 'dietitian', label: 'Diëtist' },
  { value: 'chiropractor', label: 'Chiropractor' },
  { value: 'veterinary', label: 'Dierenarts' },
  { value: 'optician', label: 'Opticien' },
  { value: 'pharmacy', label: 'Apotheek' },
  
  // Sport & Fitness
  { value: 'gym', label: 'Sportschool' },
  { value: 'personal_trainer', label: 'Personal Trainer' },
  { value: 'yoga', label: 'Yoga Studio' },
  { value: 'pilates', label: 'Pilates Studio' },
  { value: 'dance', label: 'Dansschool' },
  { value: 'martial_arts', label: 'Vechtsport' },
  { value: 'swimming', label: 'Zwemles' },
  { value: 'tennis', label: 'Tennis Coach' },
  
  // Educatie & Training
  { value: 'driving_school', label: 'Rijschool' },
  { value: 'tutor', label: 'Bijles/Tutoring' },
  { value: 'music_teacher', label: 'Muziekleraar' },
  { value: 'language_school', label: 'Taalschool' },
  { value: 'workshop', label: 'Workshop/Cursus' },
  { value: 'coaching', label: 'Life Coach' },
  { value: 'business_coach', label: 'Business Coach' },
  
  // Services
  { value: 'car_repair', label: 'Autogarage' },
  { value: 'car_wash', label: 'Autowasstraat' },
  { value: 'cleaning', label: 'Schoonmaakbedrijf' },
  { value: 'photography', label: 'Fotograaf' },
  { value: 'videography', label: 'Videograaf' },
  { value: 'catering', label: 'Catering' },
  { value: 'event_planning', label: 'Event Planner' },
  { value: 'real_estate', label: 'Makelaar' },
  { value: 'legal', label: 'Advocaat/Juridisch' },
  { value: 'accounting', label: 'Accountant' },
  { value: 'consulting', label: 'Consultant' },
  { value: 'it_services', label: 'IT Services' },
  
  // Overig
  { value: 'other', label: 'Anders' }
];

// Booking window opties
const bookingWindowOptions = [
  { value: 1, label: '1 dag' },
  { value: 3, label: '3 dagen' },
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weken' },
  { value: 21, label: '3 weken' },
  { value: 30, label: '1 maand' },
  { value: 45, label: '6 weken' },
  { value: 60, label: '2 maanden' },
  { value: 90, label: '3 maanden' },
  { value: 120, label: '4 maanden' },
  { value: 180, label: '6 maanden' },
  { value: 365, label: '1 jaar' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  // Uitgebreide profiel data
  const [profileData, setProfileData] = useState({
    // Basis info
    full_name: '',
    email: '',
    phone: '',
    avatar_url: '',
    
    // Extra profiel info
    date_of_birth: '',
    gender: '',
    language: 'nl',
    timezone: 'Europe/Amsterdam',
    
    // Contact info
    address_street: '',
    address_number: '',
    address_postal: '',
    address_city: '',
    address_country: 'Nederland',
    
    // Social media
    website: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    tiktok: '',
  });

  // Uitgebreide bedrijfs data
  const [businessData, setBusinessData] = useState({
    // Basis info
    business_name: '',
    business_type: '',
    business_type_other: '', // Als "Anders" is geselecteerd
    kvk_number: '',
    btw_number: '',
    
    // Contact info
    business_phone: '',
    business_email: '',
    business_whatsapp: '',
    
    // Adres info
    business_street: '',
    business_number: '',
    business_postal: '',
    business_city: '',
    business_country: 'Nederland',
    
    // Openingstijden display
    show_opening_hours: true,
    opening_hours_note: '',
    
    // Team grootte
    team_size: '1',
    
    // Betalingen
    payment_methods: {
      cash: true,
      pin: true,
      creditcard: false,
      ideal: false,
      paypal: false,
      tikkie: false,
    },
    
    // Policies
    cancellation_policy: '24', // uren
    no_show_policy: 'charge_full', // charge_full, charge_partial, no_charge
    deposit_required: false,
    deposit_percentage: 0,
    
    // Beschrijvingen
    business_description: '',
    parking_info: '',
    public_transport_info: '',
    accessibility_info: '',
  });

  // Uitgebreide kalender settings
  const [calendarSettings, setCalendarSettings] = useState({
    // Booking windows
    booking_window_days: 60,
    minimum_notice_hours: 24,
    maximum_notice_days: 0, // 0 = geen maximum
    
    // Tijdslots
    slot_duration: 30,
    slot_interval: 15, // Hoe vaak slots beginnen
    buffer_time_before: 0,
    buffer_time_after: 0,
    
    // Limieten
    max_bookings_per_day: null,
    max_bookings_per_customer_per_day: 1,
    max_future_bookings_per_customer: 5,
    
    // Werkdagen
    working_days: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    
    // Standaard werktijden
    default_start_time: '09:00',
    default_end_time: '17:00',
    lunch_break_enabled: false,
    lunch_start_time: '12:00',
    lunch_end_time: '13:00',
    
    // Vakantie mode
    vacation_mode: false,
    vacation_message: '',
    
    // Booking confirmatie
    require_confirmation: true,
    auto_confirm_regular_customers: false,
    send_confirmation_email: true,
    send_confirmation_whatsapp: true,
    
    // Herinneringen
    reminder_enabled: true,
    reminder_hours_before: 24,
    second_reminder_enabled: false,
    second_reminder_hours_before: 2,
    
    // Google Calendar sync
    google_calendar_sync: false,
    google_calendar_id: '',
  });

  // Uitgebreide WhatsApp settings
  const [whatsappSettings, setWhatsappSettings] = useState({
    // Basis
    whatsapp_enabled: true,
    whatsapp_number: '',
    business_hours_only: true,
    
    // Auto-replies
    welcome_message: 'Hallo! 👋 Welkom bij {business_name}. Ik ben uw persoonlijke booking assistant. Hoe kan ik u helpen?',
    outside_hours_message: 'Bedankt voor uw bericht! We zijn momenteel gesloten. We reageren zo snel mogelijk tijdens openingstijden.',
    
    // Booking flow messages
    service_selection_message: 'Welke service zou u willen boeken?',
    date_selection_message: 'Op welke datum wilt u langskomen?',
    time_selection_message: 'Welk tijdstip past het beste bij u?',
    confirmation_message: 'Perfect! Uw afspraak voor {service} op {date} om {time} is bevestigd. Tot dan! ✅',
    
    // Intelligente responses
    enable_ai_responses: true,
    ai_personality: 'professional', // professional, friendly, casual
    ai_language_style: 'formal', // formal, informal
    
    // Quick replies
    quick_replies_enabled: true,
    quick_replies: [
      { trigger: 'prijzen', response: 'Onze actuele prijslijst vindt u op onze website: {website}' },
      { trigger: 'locatie', response: 'U vindt ons op: {address}' },
      { trigger: 'parkeren', response: '{parking_info}' },
    ],
    
    // Keywords voor service detection
    service_keywords: {
      enabled: true,
      keywords: [
        { keyword: 'knippen', service: 'Knippen' },
        { keyword: 'kleuren', service: 'Kleuren' },
        { keyword: 'föhnen', service: 'Föhnen' },
      ],
    },
    
    // Notificaties naar business
    notify_new_conversation: true,
    notify_new_booking: true,
    notify_cancellation: true,
    notification_email: '',
    
    // Conversation settings
    auto_close_after_hours: 48,
    typing_indicator: true,
    read_receipts: true,
    
    // Blacklist
    blacklist_enabled: false,
    blacklisted_numbers: [],
    
    // Analytics
    track_conversion: true,
    track_response_time: true,
  });

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile && user) {
      setProfileData({
        full_name: profile.full_name || '',
        email: user.email || '',
        phone: profile.phone || '',
        avatar_url: '',
        date_of_birth: '',
        gender: '',
        language: 'nl',
        timezone: 'Europe/Amsterdam',
        address_street: '',
        address_number: '',
        address_postal: '',
        address_city: '',
        address_country: 'Nederland',
        website: '',
        facebook: '',
        instagram: '',
        linkedin: '',
        tiktok: '',
      });
      
      setBusinessData(prev => ({
        ...prev,
        business_name: profile.business_name || '',
        business_type: (profile.business_type as BusinessType) || '',
      }));
      
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
        setCalendarSettings(prev => ({
          ...prev,
          booking_window_days: settings.booking_window_days || 60,
          minimum_notice_hours: settings.minimum_notice_hours || 24,
          slot_duration: settings.slot_duration || 30,
          buffer_time_before: settings.buffer_time || 0,
          buffer_time_after: settings.buffer_time || 0,
          max_bookings_per_day: settings.max_bookings_per_day,
        }));
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
        full_name: profileData.full_name,
        phone: profileData.phone,
        business_name: businessData.business_name,
        business_type: businessData.business_type,
      });
      
      toast({
        title: "Success",
        description: "Profiel succesvol bijgewerkt",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Kon profiel niet bijwerken",
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
          description: "Kalender niet gevonden",
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
          buffer_time: calendarSettings.buffer_time_before,
          max_bookings_per_day: calendarSettings.max_bookings_per_day,
        })
        .eq('calendar_id', calendarId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Kalender instellingen succesvol bijgewerkt",
      });
    } catch (error) {
      console.error('Error updating calendar settings:', error);
      toast({
        title: "Error",
        description: "Kon kalender instellingen niet bijwerken",
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
        description: "WhatsApp instellingen succesvol bijgewerkt",
      });
    } catch (error) {
      console.error('Error updating WhatsApp settings:', error);
      toast({
        title: "Error",
        description: "Kon WhatsApp instellingen niet bijwerken",
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

  // Tab content voor Profile
  const ProfileTab = () => (
    <div className="space-y-8">
      {/* Basis Informatie */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Basis Informatie</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Volledige Naam *
            </label>
            <input
              type="text"
              value={profileData.full_name}
              onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Telefoonnummer *
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Geboortedatum
            </label>
            <input
              type="date"
              value={profileData.date_of_birth}
              onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Taal
            </label>
            <select
              value={profileData.language}
              onChange={(e) => setProfileData({ ...profileData, language: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="nl">Nederlands</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="tr">Türkçe</option>
              <option value="ar">العربية</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tijdzone
            </label>
            <select
              value={profileData.timezone}
              onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="Europe/Amsterdam">Amsterdam (CET)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="America/New_York">New York (EST)</option>
              <option value="America/Los_Angeles">Los Angeles (PST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Adres Informatie */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Adres Informatie</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Straatnaam
            </label>
            <input
              type="text"
              value={profileData.address_street}
              onChange={(e) => setProfileData({ ...profileData, address_street: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Huisnummer
            </label>
            <input
              type="text"
              value={profileData.address_number}
              onChange={(e) => setProfileData({ ...profileData, address_number: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Postcode
            </label>
            <input
              type="text"
              value={profileData.address_postal}
              onChange={(e) => setProfileData({ ...profileData, address_postal: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Plaats
            </label>
            <input
              type="text"
              value={profileData.address_city}
              onChange={(e) => setProfileData({ ...profileData, address_city: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Social Media & Website</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Website
            </label>
            <input
              type="url"
              value={profileData.website}
              onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
              placeholder="https://www.example.com"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Instagram
            </label>
            <input
              type="text"
              value={profileData.instagram}
              onChange={(e) => setProfileData({ ...profileData, instagram: e.target.value })}
              placeholder="@username"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Facebook
            </label>
            <input
              type="text"
              value={profileData.facebook}
              onChange={(e) => setProfileData({ ...profileData, facebook: e.target.value })}
              placeholder="facebook.com/pagename"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleUpdateProfile}
        disabled={loading}
        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Opslaan...' : 'Profiel Opslaan'}
      </button>
    </div>
  );

  // Tab content voor Business
  const BusinessTab = () => (
    <div className="space-y-8">
      {/* Bedrijfs Basis Info */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Bedrijfsinformatie</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bedrijfsnaam *
            </label>
            <input
              type="text"
              value={businessData.business_name}
              onChange={(e) => setBusinessData({ ...businessData, business_name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type Bedrijf *
            </label>
            <Select
              value={businessTypes.find(type => type.value === businessData.business_type)}
              onChange={(option) => setBusinessData({ ...businessData, business_type: option?.value || '' })}
              options={businessTypes}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Zoek en selecteer type bedrijf..."
              isSearchable
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: '#111827',
                  borderColor: '#374151',
                  '&:hover': { borderColor: '#10B981' }
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: '#111827',
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#10B981' : state.isFocused ? '#1F2937' : '#111827',
                  color: 'white',
                }),
                singleValue: (base) => ({
                  ...base,
                  color: 'white',
                }),
                input: (base) => ({
                  ...base,
                  color: 'white',
                }),
              }}
            />
            
            {businessData.business_type === 'other' && (
              <input
                type="text"
                value={businessData.business_type_other}
                onChange={(e) => setBusinessData({ ...businessData, business_type_other: e.target.value })}
                placeholder="Specificeer type bedrijf..."
                className="mt-2 w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                KVK Nummer
              </label>
              <input
                type="text"
                value={businessData.kvk_number}
                onChange={(e) => setBusinessData({ ...businessData, kvk_number: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                BTW Nummer
              </label>
              <input
                type="text"
                value={businessData.btw_number}
                onChange={(e) => setBusinessData({ ...businessData, btw_number: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bedrijfsomschrijving
            </label>
            <textarea
              value={businessData.business_description}
              onChange={(e) => setBusinessData({ ...businessData, business_description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Vertel klanten over uw bedrijf..."
            />
          </div>
        </div>
      </div>

      {/* Betalingen & Policies */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Betalingen & Beleid</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Geaccepteerde Betaalmethoden
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries({
                cash: 'Contant',
                pin: 'PIN',
                creditcard: 'Creditcard',
                ideal: 'iDEAL',
                paypal: 'PayPal',
                tikkie: 'Tikkie'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={businessData.payment_methods[key]}
                    onChange={(e) => setBusinessData({
                      ...businessData,
                      payment_methods: {
                        ...businessData.payment_methods,
                        [key]: e.target.checked
                      }
                    })}
                    className="w-4 h-4 text-green-600 bg-gray-900 border-gray-700 rounded focus:ring-green-600"
                  />
                  <span className="text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Annuleringsbeleid
              </label>
              <select
                value={businessData.cancellation_policy}
                onChange={(e) => setBusinessData({ ...businessData, cancellation_policy: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              >
                <option value="0">Flexibel - Altijd gratis annuleren</option>
                <option value="12">12 uur van tevoren</option>
                <option value="24">24 uur van tevoren</option>
                <option value="48">48 uur van tevoren</option>
                <option value="72">72 uur van tevoren</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                No-show Beleid
              </label>
              <select
                value={businessData.no_show_policy}
                onChange={(e) => setBusinessData({ ...businessData, no_show_policy: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              >
                <option value="no_charge">Geen kosten</option>
                <option value="charge_partial">50% in rekening brengen</option>
                <option value="charge_full">Volledig bedrag in rekening brengen</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              id="deposit"
              checked={businessData.deposit_required}
              onChange={(e) => setBusinessData({ ...businessData, deposit_required: e.target.checked })}
              className="w-4 h-4 text-green-600 bg-gray-900 border-gray-700 rounded focus:ring-green-600"
            />
            <label htmlFor="deposit" className="text-gray-300">
              Aanbetaling vereist
            </label>
            {businessData.deposit_required && (
              <input
                type="number"
                value={businessData.deposit_percentage}
                onChange={(e) => setBusinessData({ ...businessData, deposit_percentage: parseInt(e.target.value) })}
                className="w-20 px-3 py-1 bg-gray-900 border border-gray-700 rounded text-white"
                placeholder="%"
                min="0"
                max="100"
              />
            )}
          </div>
        </div>
      </div>

      {/* Locatie & Bereikbaarheid */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Locatie & Bereikbaarheid</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Parkeerinformatie
            </label>
            <textarea
              value={businessData.parking_info}
              onChange={(e) => setBusinessData({ ...businessData, parking_info: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Bijv: Gratis parkeren voor de deur, Betaald parkeren in garage om de hoek..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Openbaar Vervoer
            </label>
            <textarea
              value={businessData.public_transport_info}
              onChange={(e) => setBusinessData({ ...businessData, public_transport_info: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Bijv: 5 minuten lopen vanaf station, Bus 12 stopt voor de deur..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Toegankelijkheid
            </label>
            <textarea
              value={businessData.accessibility_info}
              onChange={(e) => setBusinessData({ ...businessData, accessibility_info: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Bijv: Rolstoeltoegankelijk, Lift aanwezig, Drempelloos..."
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleUpdateProfile}
        disabled={loading}
        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Opslaan...' : 'Bedrijfsinformatie Opslaan'}
      </button>
    </div>
  );

  // Tab content voor Calendar
  const CalendarTab = () => (
    <div className="space-y-8">
      {/* Booking Windows */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Booking Vensters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              {bookingWindowOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
              <option value="0.5">30 minuten van tevoren</option>
              <option value="1">1 uur van tevoren</option>
              <option value="2">2 uur van tevoren</option>
              <option value="3">3 uur van tevoren</option>
              <option value="4">4 uur van tevoren</option>
              <option value="6">6 uur van tevoren</option>
              <option value="12">12 uur van tevoren</option>
              <option value="24">24 uur van tevoren</option>
              <option value="48">48 uur van tevoren</option>
              <option value="72">72 uur van tevoren</option>
              <option value="168">1 week van tevoren</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tijdslot duur (minuten)
            </label>
            <select
              value={calendarSettings.slot_duration}
              onChange={(e) => setCalendarSettings({ 
                ...calendarSettings, 
                slot_duration: parseInt(e.target.value) 
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="10">10 minuten</option>
              <option value="15">15 minuten</option>
              <option value="20">20 minuten</option>
              <option value="30">30 minuten</option>
              <option value="45">45 minuten</option>
              <option value="60">60 minuten</option>
              <option value="90">90 minuten</option>
              <option value="120">120 minuten</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Slot interval (hoe vaak beginnen slots)
            </label>
            <select
              value={calendarSettings.slot_interval}
              onChange={(e) => setCalendarSettings({ 
                ...calendarSettings, 
                slot_interval: parseInt(e.target.value) 
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="5">Elke 5 minuten</option>
              <option value="10">Elke 10 minuten</option>
              <option value="15">Elke 15 minuten</option>
              <option value="30">Elke 30 minuten</option>
              <option value="60">Elk uur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Buffer Times */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Buffer Tijden</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buffer tijd voor afspraak (minuten)
            </label>
            <input
              type="number"
              value={calendarSettings.buffer_time_before}
              onChange={(e) => setCalendarSettings({ 
                ...calendarSettings, 
                buffer_time_before: parseInt(e.target.value) 
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              min="0"
              max="60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buffer tijd na afspraak (minuten)
            </label>
            <input
              type="number"
              value={calendarSettings.buffer_time_after}
              onChange={(e) => setCalendarSettings({ 
                ...calendarSettings, 
                buffer_time_after: parseInt(e.target.value) 
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              min="0"
              max="60"
            />
          </div>
        </div>
      </div>

      {/* Werkdagen */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Werkdagen</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries({
            monday: 'Maandag',
            tuesday: 'Dinsdag',
            wednesday: 'Woensdag',
            thursday: 'Donderdag',
            friday: 'Vrijdag',
            saturday: 'Zaterdag',
            sunday: 'Zondag'
          }).map(([key, label]) => (
            <label key={key} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={calendarSettings.working_days[key]}
                onChange={(e) => setCalendarSettings({
                  ...calendarSettings,
                  working_days: {
                    ...calendarSettings.working_days,
                    [key]: e.target.checked
                  }
                })}
                className="w-4 h-4 text-green-600 bg-gray-900 border-gray-700 rounded focus:ring-green-600"
              />
              <span className="text-gray-300">{label}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Standaard starttijd
            </label>
            <input
              type="time"
              value={calendarSettings.default_start_time}
              onChange={(e) => setCalendarSettings({ ...calendarSettings, default_start_time: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Standaard eindtijd
            </label>
            <input
              type="time"
              value={calendarSettings.default_end_time}
              onChange={(e) => setCalendarSettings({ ...calendarSettings, default_end_time: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Limieten */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Booking Limieten</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max bookings per dag (leeg = onbeperkt)
            </label>
            <input
              type="number"
              value={calendarSettings.max_bookings_per_day || ''}
              onChange={(e) => setCalendarSettings({ 
                ...calendarSettings, 
                max_bookings_per_day: e.target.value ? parseInt(e.target.value) : null 
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max bookings per klant per dag
            </label>
            <input
              type="number"
              value={calendarSettings.max_bookings_per_customer_per_day}
              onChange={(e) => setCalendarSettings({ 
                ...calendarSettings, 
                max_bookings_per_customer_per_day: parseInt(e.target.value) 
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              min="1"
              max="10"
            />
          </div>
        </div>
      </div>

      {/* Herinneringen */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Automatische Herinneringen</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Eerste herinnering</h3>
              <p className="text-sm text-gray-400">Stuur automatisch een herinnering</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={calendarSettings.reminder_hours_before}
                onChange={(e) => setCalendarSettings({ 
                  ...calendarSettings, 
                  reminder_hours_before: parseInt(e.target.value) 
                })}
                disabled={!calendarSettings.reminder_enabled}
                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              >
                <option value="1">1 uur</option>
                <option value="2">2 uur</option>
                <option value="4">4 uur</option>
                <option value="12">12 uur</option>
                <option value="24">24 uur</option>
                <option value="48">48 uur</option>
              </select>
              <button
                onClick={() => setCalendarSettings({ 
                  ...calendarSettings, 
                  reminder_enabled: !calendarSettings.reminder_enabled 
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  calendarSettings.reminder_enabled ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  calendarSettings.reminder_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Tweede herinnering</h3>
              <p className="text-sm text-gray-400">Extra herinnering vlak voor afspraak</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={calendarSettings.second_reminder_hours_before}
                onChange={(e) => setCalendarSettings({ 
                  ...calendarSettings, 
                  second_reminder_hours_before: parseInt(e.target.value) 
                })}
                disabled={!calendarSettings.second_reminder_enabled}
                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              >
                <option value="1">1 uur</option>
                <option value="2">2 uur</option>
                <option value="3">3 uur</option>
              </select>
              <button
                onClick={() => setCalendarSettings({ 
                  ...calendarSettings, 
                  second_reminder_enabled: !calendarSettings.second_reminder_enabled 
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  calendarSettings.second_reminder_enabled ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  calendarSettings.second_reminder_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleUpdateCalendarSettings}
        disabled={loading}
        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Opslaan...' : 'Kalender Instellingen Opslaan'}
      </button>
    </div>
  );

  // Tab content voor WhatsApp
  const WhatsAppTab = () => {
    return (
      <div className="space-y-8">
        {/* WhatsApp Status */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">WhatsApp Business API</h2>
              <p className="text-sm text-gray-400 mt-1">Beheer je WhatsApp booking assistant</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400">Verbonden</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                WhatsApp Business Nummer
              </label>
              <input
                type="tel"
                value={whatsappSettings.whatsapp_number}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_number: e.target.value })}
                placeholder="+31 6 12345678"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                id="business_hours"
                checked={whatsappSettings.business_hours_only}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, business_hours_only: e.target.checked })}
                className="w-4 h-4 text-green-600 bg-gray-900 border-gray-700 rounded focus:ring-green-600"
              />
              <label htmlFor="business_hours" className="text-gray-300">
                Alleen actief tijdens openingstijden
              </label>
            </div>
          </div>
        </div>

        {/* Welkomstberichten */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6">Automatische Berichten</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Welkomstbericht
              </label>
              <textarea
                value={whatsappSettings.welcome_message}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, welcome_message: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Variabelen: {'{business_name}'}, {'{customer_name}'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bericht buiten openingstijden
              </label>
              <textarea
                value={whatsappSettings.outside_hours_message}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, outside_hours_message: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Booking Flow Messages */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6">Booking Flow Berichten</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Service selectie bericht
              </label>
              <textarea
                value={whatsappSettings.service_selection_message}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, service_selection_message: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Datum selectie bericht
              </label>
              <textarea
                value={whatsappSettings.date_selection_message}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, date_selection_message: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tijd selectie bericht
              </label>
              <textarea
                value={whatsappSettings.time_selection_message}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, time_selection_message: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bevestigingsbericht
              </label>
              <textarea
                value={whatsappSettings.confirmation_message}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, confirmation_message: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Variabelen: {'{service}'}, {'{date}'}, {'{time}'}, {'{customer_name}'}
              </p>
            </div>
          </div>
        </div>

        {/* AI Settings */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6">AI Assistant Instellingen</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
              <div>
                <h3 className="text-white font-medium">Intelligente Responses</h3>
                <p className="text-sm text-gray-400">AI begrijpt context en geeft slimme antwoorden</p>
              </div>
              <button
                onClick={() => setWhatsappSettings({ 
                  ...whatsappSettings, 
                  enable_ai_responses: !whatsappSettings.enable_ai_responses 
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  whatsappSettings.enable_ai_responses ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  whatsappSettings.enable_ai_responses ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {whatsappSettings.enable_ai_responses && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    AI Persoonlijkheid
                  </label>
                  <select
                    value={whatsappSettings.ai_personality}
                    onChange={(e) => setWhatsappSettings({ ...whatsappSettings, ai_personality: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  >
                    <option value="professional">Professioneel</option>
                    <option value="friendly">Vriendelijk</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formeel</option>
                    <option value="enthusiastic">Enthousiast</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Taalstijl
                  </label>
                  <select
                    value={whatsappSettings.ai_language_style}
                    onChange={(e) => setWhatsappSettings({ ...whatsappSettings, ai_language_style: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  >
                    <option value="formal">U/Uw (Formeel)</option>
                    <option value="informal">Je/Jouw (Informeel)</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Replies */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6">Quick Replies</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">Automatische antwoorden op veelgestelde vragen</p>
              <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">
                + Toevoegen
              </button>
            </div>

            {whatsappSettings.quick_replies.map((reply, index) => (
              <div key={index} className="p-4 bg-gray-900 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Trigger woord
                    </label>
                    <input
                      type="text"
                      value={reply.trigger}
                      className="w-full px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Antwoord
                    </label>
                    <input
                      type="text"
                      value={reply.response}
                      className="w-full px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Keywords */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6">Service Herkenning</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
              <div>
                <h3 className="text-white font-medium">Automatische Service Detectie</h3>
                <p className="text-sm text-gray-400">Herken services op basis van keywords</p>
              </div>
              <button
                onClick={() => setWhatsappSettings({ 
                  ...whatsappSettings, 
                  service_keywords: {
                    ...whatsappSettings.service_keywords,
                    enabled: !whatsappSettings.service_keywords.enabled
                  }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  whatsappSettings.service_keywords.enabled ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  whatsappSettings.service_keywords.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {whatsappSettings.service_keywords.enabled && (
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-400">Keywords per service</p>
                  <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm">
                    + Keyword
                  </button>
                </div>
                {whatsappSettings.service_keywords.keywords.map((keyword, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={keyword.keyword}
                      placeholder="Keyword"
                      className="flex-1 px-3 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                    />
                    <span className="text-gray-400">→</span>
                    <input
                      type="text"
                      value={keyword.service}
                      placeholder="Service naam"
                      className="flex-1 px-3 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                    />
                    <button className="text-red-400 hover:text-red-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversation Settings */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6">Conversatie Instellingen</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Auto-close conversaties na (uren)
              </label>
              <input
                type="number"
                value={whatsappSettings.auto_close_after_hours}
                onChange={(e) => setWhatsappSettings({ 
                  ...whatsappSettings, 
                  auto_close_after_hours: parseInt(e.target.value) 
                })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                min="1"
                max="168"
              />
            </div>

            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={whatsappSettings.typing_indicator}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, typing_indicator: e.target.checked })}
                  className="w-4 h-4 text-green-600 bg-gray-900 border-gray-700 rounded focus:ring-green-600"
                />
                <span className="text-gray-300">Toon "aan het typen" indicator</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={whatsappSettings.read_receipts}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, read_receipts: e.target.checked })}
                  className="w-4 h-4 text-green-600 bg-gray-900 border-gray-700 rounded focus:ring-green-600"
                />
                <span className="text-gray-300">Toon leesbevestigingen</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={whatsappSettings.track_conversion}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, track_conversion: e.target.checked })}
                  className="w-4 h-4 text-green-600 bg-gray-900 border-gray-700 rounded focus:ring-green-600"
                />
                <span className="text-gray-300">Track conversie rates</span>
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={handleUpdateWhatsAppSettings}
          disabled={loading}
          className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Opslaan...' : 'WhatsApp Instellingen Opslaan'}
        </button>
      </div>
    );
  };

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
            {['profile', 'business', 'calendar', 'whatsapp'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                }`}
              >
                {tab === 'whatsapp' ? 'WhatsApp' : tab === 'business' ? 'Bedrijf' : tab === 'calendar' ? 'Kalender' : 'Profiel'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'business' && <BusinessTab />}
          {activeTab === 'calendar' && <CalendarTab />}
          {activeTab === 'whatsapp' && <WhatsAppTab />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
