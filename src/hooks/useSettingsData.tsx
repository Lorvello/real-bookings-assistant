import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// The exact shape public.users accepts on an UPDATE (generated Supabase types). Used to
// type the partial save payload so its keys are constrained to real, writable columns:
// the type-system mirror of the SAVEABLE_COLUMNS runtime allowlist below.
type UsersUpdate = TablesUpdate<'users'>;

// The single set of columns the Settings surface (Profile + AI Knowledge tabs) is
// allowed to write to public.users. saveFields() filters every payload through this
// so a tab can only ever update its own real columns — never id/email/subscription_*
// or anything else. This is the allowlist that makes a partial, per-tab save safe.
const SAVEABLE_COLUMNS = new Set<keyof UsersUpdate>([
  // Profile (Users tab)
  'full_name', 'phone', 'date_of_birth',
  // Website + socials (AI Knowledge tab)
  'website', 'facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'x',
  // Business / AI Knowledge
  'business_name', 'business_type', 'business_type_other',
  'business_phone', 'business_email', 'business_whatsapp',
  'business_street', 'business_number', 'business_postal', 'business_city', 'business_country',
  'business_description',
  'parking_info', 'public_transport_info', 'accessibility_info', 'other_info',
  'cancellation_policy', 'payment_info', 'preparation_info',
  'show_opening_hours', 'opening_hours_note', 'team_size',
]);

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

  const [loading, setLoading] = useState(false);   // save in progress
  const [isLoading, setIsLoading] = useState(true); // initial fetch in progress
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // Surface the load failure instead of swallowing it. A silent console.error
        // here used to leave the whole Settings surface stuck on its skeleton with
        // no error and no Save bar (the #1 "nothing happens" report).
        console.error('Error fetching user data:', error);
        setLoadError(error.message || 'Could not load your settings.');
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
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      setLoadError(error?.message || 'Could not load your settings.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user, fetchUserData]);

  // Partial save: writes ONLY the columns a tab actually changed. Each Settings tab
  // computes its own dirty fields and calls this with just those, so a save from the
  // Profile tab can never clobber the AI-Knowledge tab's fields (and vice versa) the
  // way the old whole-row handleBatchUpdate did. Returns true on success.
  const saveFields = async (changes: Record<string, any>): Promise<boolean> => {
    if (!user) return false;

    // Keep only allowlisted columns; coalesce empty strings to null (nullable text),
    // leave booleans / non-empty values untouched. Typed as UsersUpdate so the payload's
    // keys are provably writable users columns (the type-checker's view of the same
    // allowlist SAVEABLE_COLUMNS enforces at runtime).
    const payload: UsersUpdate = {};
    for (const [key, value] of Object.entries(changes || {})) {
      if (!SAVEABLE_COLUMNS.has(key as keyof UsersUpdate)) continue;
      const col = key as keyof UsersUpdate;
      (payload as Record<keyof UsersUpdate, unknown>)[col] =
        typeof value === 'string' && value.trim() === '' ? null : value;
    }

    // Nothing meaningful to write (all changes were non-saveable / empty diffs).
    if (Object.keys(payload).length === 0) return true;

    payload.updated_at = new Date().toISOString();
    setLoading(true);
    setSaveError(null);

    try {
      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', user.id);

      if (error) {
        console.error('Error saving settings:', error);
        setSaveError(error.message || 'Could not save your changes.');
        toast({
          title: 'Could not save',
          description: error.message || 'An error occurred while saving your changes.',
          variant: 'destructive',
        });
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setSaveError(error?.message || 'An unexpected error occurred.');
      toast({
        title: 'Could not save',
        description: error?.message || 'An unexpected error occurred.',
        variant: 'destructive',
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
    isLoading,
    loadError,
    saveError,
    saveFields,
    refetch: fetchUserData
  };
};
