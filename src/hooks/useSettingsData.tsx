
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
        // Update profile data
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

        // Update business data
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

  const handleUpdateProfile = async (customProfileData?: any) => {
    if (!user) return;
    
    setLoading(true);
    const dataToUse = customProfileData || profileData;
    console.log('Updating profile with data:', dataToUse);

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
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het opslaan van je profiel.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Succes",
        description: "Je profiel is succesvol bijgewerkt!",
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Fout",
        description: "Er is een onverwachte fout opgetreden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBusiness = async (customBusinessData?: any) => {
    if (!user) return;
    
    setLoading(true);
    const dataToUse = customBusinessData || businessData;
    console.log('Updating business with data:', dataToUse);

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
        toast({
          title: "Fout",
          description: "Er is een fout opgetreden bij het opslaan van je bedrijfsgegevens.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Succes",
        description: "Je bedrijfsgegevens zijn succesvol bijgewerkt!",
      });

    } catch (error) {
      console.error('Error updating business:', error);
      toast({
        title: "Fout",
        description: "Er is een onverwachte fout opgetreden.",
        variant: "destructive",
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
    loading,
    handleUpdateProfile,
    handleUpdateBusiness,
    refetch: fetchUserData
  };
};
