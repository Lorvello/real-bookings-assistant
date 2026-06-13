import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useSettingsData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState({
    id: null as string | null,  // Used to track if real server data is loaded
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    language: 'nl',
    timezone: 'Europe/Amsterdam',
    avatar_url: '',
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
    youtube: '',
    x: '',
    subscription_tier: null as string | null
  });

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
    business_description: '',
    parking_info: '',
    public_transport_info: '',
    accessibility_info: '',
    other_info: '',
    cancellation_policy: '',
    payment_info: '',
    preparation_info: '',
    show_opening_hours: true,
    opening_hours_note: '',
    team_size: '1'
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return;
      }

      if (data) {
        setProfileData({
          id: data.id,  // Include id to indicate real data is loaded
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          language: data.language || 'nl',
          timezone: data.timezone || 'Europe/Amsterdam',
          avatar_url: data.avatar_url || '',
          address_street: data.address_street || '',
          address_number: data.address_number || '',
          address_postal: data.address_postal || '',
          address_city: data.address_city || '',
          address_country: data.address_country || 'Nederland',
          website: data.website || '',
          facebook: data.facebook || '',
          instagram: data.instagram || '',
          linkedin: data.linkedin || '',
          tiktok: data.tiktok || '',
          youtube: data.youtube || '',
          x: data.x || '',
          subscription_tier: data.subscription_tier || null
        });

        setBusinessData({
          business_name: data.business_name || '',
          business_type: data.business_type || '',
          business_type_other: data.business_type_other || '',
          business_phone: data.business_phone || '',
          business_email: data.business_email || '',
          business_whatsapp: data.business_whatsapp || '',
          business_street: data.business_street || '',
          business_number: data.business_number || '',
          business_postal: data.business_postal || '',
          business_city: data.business_city || '',
          business_country: data.business_country || 'Nederland',
          business_description: data.business_description || '',
          parking_info: data.parking_info || '',
          public_transport_info: data.public_transport_info || '',
          accessibility_info: data.accessibility_info || '',
          other_info: data.other_info || '',
          cancellation_policy: data.cancellation_policy || '',
          payment_info: data.payment_info || '',
          preparation_info: data.preparation_info || '',
          show_opening_hours: data.show_opening_hours ?? true,
          opening_hours_note: data.opening_hours_note || '',
          team_size: data.team_size || '1'
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Batch update - combines profile and business updates in one call, no individual toasts
  const handleBatchUpdate = async (profileChanges: any, businessChanges: any) => {
    if (!user) return false;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          // Profile fields. This is the LIVE save path (AIKnowledgeTab + UserManagement
          // call handleBatchUpdate). email is intentionally NOT written: it's the login
          // email (auth.users.email), the UI field is read-only, and writing only
          // public.users.email would let it diverge. gender, language, timezone,
          // avatar_url and the personal address_* fields have no edit-UI or consumer and
          // were being blindly re-written with hardcoded defaults on every save (which
          // could clobber real data) -> dropped. handleBatchUpdate is now the single
          // save path (the old per-section handleUpdateProfile/Business were dead).
          full_name: profileChanges.full_name,
          phone: profileChanges.phone,
          date_of_birth: profileChanges.date_of_birth || null,
          website: profileChanges.website || null,
          facebook: profileChanges.facebook || null,
          instagram: profileChanges.instagram || null,
          linkedin: profileChanges.linkedin || null,
          tiktok: profileChanges.tiktok || null,
          youtube: profileChanges.youtube || null,
          x: profileChanges.x || null,
          // Business fields
          business_name: businessChanges.business_name || null,
          business_type: businessChanges.business_type || null,
          business_type_other: businessChanges.business_type_other || null,
          business_phone: businessChanges.business_phone || null,
          business_email: businessChanges.business_email || null,
          business_whatsapp: businessChanges.business_whatsapp || null,
          business_street: businessChanges.business_street || null,
          business_number: businessChanges.business_number || null,
          business_postal: businessChanges.business_postal || null,
          business_city: businessChanges.business_city || null,
          business_country: businessChanges.business_country,
          business_description: businessChanges.business_description || null,
          parking_info: businessChanges.parking_info || null,
          public_transport_info: businessChanges.public_transport_info || null,
          accessibility_info: businessChanges.accessibility_info || null,
          other_info: businessChanges.other_info || null,
          cancellation_policy: businessChanges.cancellation_policy || null,
          payment_info: businessChanges.payment_info || null,
          preparation_info: businessChanges.preparation_info || null,
          show_opening_hours: businessChanges.show_opening_hours,
          opening_hours_note: businessChanges.opening_hours_note || null,
          team_size: businessChanges.team_size,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error in batch update:', error);
        toast({
          title: "Error",
          description: "An error occurred while saving your changes.",
          variant: "destructive",
        });
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error in batch update:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    profileData,
    setProfileData,
    businessData,
    setBusinessData,
    loading,
    handleBatchUpdate,
    refetch: fetchUserData
  };
};
