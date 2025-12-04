import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useSettingsData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState({
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
          show_opening_hours: data.show_opening_hours ?? true,
          opening_hours_note: data.opening_hours_note || '',
          team_size: data.team_size || '1'
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Silent update for profile - no toast (used by batch update)
  const handleUpdateProfile = async (customProfileData?: any, showToast = true) => {
    if (!user) return false;
    
    setLoading(true);
    const dataToUse = customProfileData || profileData;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: dataToUse.full_name,
          email: dataToUse.email,
          phone: dataToUse.phone,
          date_of_birth: dataToUse.date_of_birth || null,
          gender: dataToUse.gender || null,
          language: dataToUse.language,
          timezone: dataToUse.timezone,
          avatar_url: dataToUse.avatar_url || null,
          address_street: dataToUse.address_street || null,
          address_number: dataToUse.address_number || null,
          address_postal: dataToUse.address_postal || null,
          address_city: dataToUse.address_city || null,
          address_country: dataToUse.address_country,
          website: dataToUse.website || null,
          facebook: dataToUse.facebook || null,
          instagram: dataToUse.instagram || null,
          linkedin: dataToUse.linkedin || null,
          tiktok: dataToUse.tiktok || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        if (showToast) {
          toast({
            title: "Error",
            description: "An error occurred while saving your profile.",
            variant: "destructive",
          });
        }
        return false;
      }

      if (showToast) {
        toast({
          title: "Success",
          description: "Your profile has been updated successfully!",
        });
      }
      return true;

    } catch (error) {
      console.error('Error updating profile:', error);
      if (showToast) {
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Silent update for business - no toast (used by batch update)
  const handleUpdateBusiness = async (customBusinessData?: any, showToast = true) => {
    if (!user) return false;
    
    setLoading(true);
    const dataToUse = customBusinessData || businessData;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          business_name: dataToUse.business_name || null,
          business_type: dataToUse.business_type || null,
          business_type_other: dataToUse.business_type_other || null,
          business_phone: dataToUse.business_phone || null,
          business_email: dataToUse.business_email || null,
          business_whatsapp: dataToUse.business_whatsapp || null,
          business_street: dataToUse.business_street || null,
          business_number: dataToUse.business_number || null,
          business_postal: dataToUse.business_postal || null,
          business_city: dataToUse.business_city || null,
          business_country: dataToUse.business_country,
          business_description: dataToUse.business_description || null,
          parking_info: dataToUse.parking_info || null,
          public_transport_info: dataToUse.public_transport_info || null,
          accessibility_info: dataToUse.accessibility_info || null,
          other_info: dataToUse.other_info || null,
          show_opening_hours: dataToUse.show_opening_hours,
          opening_hours_note: dataToUse.opening_hours_note || null,
          team_size: dataToUse.team_size,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating business:', error);
        if (showToast) {
          toast({
            title: "Error",
            description: "An error occurred while saving your business information.",
            variant: "destructive",
          });
        }
        return false;
      }

      if (showToast) {
        toast({
          title: "Success",
          description: "Your business information has been updated successfully!",
        });
      }
      return true;

    } catch (error) {
      console.error('Error updating business:', error);
      if (showToast) {
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setLoading(false);
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
          // Profile fields
          full_name: profileChanges.full_name,
          email: profileChanges.email,
          phone: profileChanges.phone,
          date_of_birth: profileChanges.date_of_birth || null,
          gender: profileChanges.gender || null,
          language: profileChanges.language,
          timezone: profileChanges.timezone,
          avatar_url: profileChanges.avatar_url || null,
          address_street: profileChanges.address_street || null,
          address_number: profileChanges.address_number || null,
          address_postal: profileChanges.address_postal || null,
          address_city: profileChanges.address_city || null,
          address_country: profileChanges.address_country,
          website: profileChanges.website || null,
          facebook: profileChanges.facebook || null,
          instagram: profileChanges.instagram || null,
          linkedin: profileChanges.linkedin || null,
          tiktok: profileChanges.tiktok || null,
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
    handleUpdateProfile,
    handleUpdateBusiness,
    handleBatchUpdate,
    refetch: fetchUserData
  };
};
