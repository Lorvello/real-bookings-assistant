
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
    tiktok: ''
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
          tiktok: data.tiktok || ''
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

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    console.log('Updating profile with data:', profileData);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileData.full_name,
          email: profileData.email,
          phone: profileData.phone,
          date_of_birth: profileData.date_of_birth || null,
          gender: profileData.gender || null,
          language: profileData.language,
          timezone: profileData.timezone,
          avatar_url: profileData.avatar_url || null,
          address_street: profileData.address_street || null,
          address_number: profileData.address_number || null,
          address_postal: profileData.address_postal || null,
          address_city: profileData.address_city || null,
          address_country: profileData.address_country,
          website: profileData.website || null,
          facebook: profileData.facebook || null,
          instagram: profileData.instagram || null,
          linkedin: profileData.linkedin || null,
          tiktok: profileData.tiktok || null,
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

  const handleUpdateBusiness = async () => {
    if (!user) return;
    
    setLoading(true);
    console.log('Updating business with data:', businessData);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          business_name: businessData.business_name || null,
          business_type: businessData.business_type || null,
          business_type_other: businessData.business_type_other || null,
          business_phone: businessData.business_phone || null,
          business_email: businessData.business_email || null,
          business_whatsapp: businessData.business_whatsapp || null,
          business_street: businessData.business_street || null,
          business_number: businessData.business_number || null,
          business_postal: businessData.business_postal || null,
          business_city: businessData.business_city || null,
          business_country: businessData.business_country,
          business_description: businessData.business_description || null,
          parking_info: businessData.parking_info || null,
          public_transport_info: businessData.public_transport_info || null,
          accessibility_info: businessData.accessibility_info || null,
          other_info: businessData.other_info || null,
          show_opening_hours: businessData.show_opening_hours,
          opening_hours_note: businessData.opening_hours_note || null,
          team_size: businessData.team_size,
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
