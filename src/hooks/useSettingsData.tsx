
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { BusinessType } from '@/types/database';

export const useSettingsData = () => {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Profile data state
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
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
    tiktok: ''
  });

  // Business data state
  const [businessData, setBusinessData] = useState({
    business_name: '',
    business_type: '',
    business_type_other: '',
    business_phone: '',
    business_email: '',
    business_whatsapp: '',
    business_street: '',
    business_number: '',
    business_postal: '',
    business_city: '',
    business_country: 'Nederland',
    show_opening_hours: true,
    opening_hours_note: '',
    team_size: '1',
    business_description: '',
    parking_info: '',
    public_transport_info: '',
    accessibility_info: '',
    other_info: ''
  });

  // Calendar settings state
  const [calendarSettings, setCalendarSettings] = useState({
    booking_window_days: 60,
    minimum_notice_hours: 24,
    maximum_notice_days: 0,
    slot_duration: 30,
    slot_interval: 15,
    buffer_time_before: 0,
    buffer_time_after: 0,
    max_bookings_per_day: null,
    max_bookings_per_customer_per_day: 1,
    max_future_bookings_per_customer: 5,
    working_days: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    default_start_time: '09:00',
    default_end_time: '17:00',
    lunch_break_enabled: false,
    lunch_start_time: '12:00',
    lunch_end_time: '13:00',
    vacation_mode: false,
    vacation_message: '',
    require_confirmation: true,
    auto_confirm_regular_customers: false,
    send_confirmation_email: true,
    send_confirmation_whatsapp: true,
    reminder_enabled: true,
    reminder_hours_before: 24,
    second_reminder_enabled: false,
    second_reminder_hours_before: 2,
    google_calendar_sync: false,
    google_calendar_id: ''
  });

  // WhatsApp settings state
  const [whatsappSettings, setWhatsappSettings] = useState({
    whatsapp_number: '',
    business_hours_only: false,
    welcome_message: '',
    outside_hours_message: '',
    service_selection_message: '',
    date_selection_message: '',
    time_selection_message: '',
    confirmation_message: '',
    ai_personality: 'professional',
    ai_language_style: 'formal',
    quick_replies: [],
    service_keywords: {
      keywords: []
    },
    auto_close_after_hours: 1,
    typing_indicator: true,
    read_receipts: true,
    track_conversion: true
  });

  // Initialize data when profile and user are loaded
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
        tiktok: ''
      });
      
      setBusinessData(prev => ({
        ...prev,
        business_name: profile.business_name || '',
        business_type: profile.business_type as BusinessType || ''
      }));
    }
  }, [profile, user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      await updateProfile({
        full_name: profileData.full_name,
        phone: profileData.phone,
        business_name: businessData.business_name,
        business_type: businessData.business_type
      });
      
      toast({
        title: "Success",
        description: "Profiel succesvol bijgewerkt"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Kon profiel niet bijwerken",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    profileData,
    setProfileData,
    businessData,
    setBusinessData,
    calendarSettings,
    setCalendarSettings,
    whatsappSettings,
    setWhatsappSettings,
    loading,
    handleUpdateProfile
  };
};
