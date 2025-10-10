import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useWhatsAppSettings(userId: string) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load settings from users table
  useEffect(() => {
    const loadSettings = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('whatsapp_phone_number, whatsapp_qr_url')
          .eq('id', userId)
          .single();

        if (error) throw error;

        if (data) {
          setPhoneNumber(data.whatsapp_phone_number || '');
          setQrUrl(data.whatsapp_qr_url || null);
          
          // Generate WhatsApp link with tracking
          if (data.whatsapp_phone_number) {
            const formatted = data.whatsapp_phone_number.replace(/\s+/g, '').replace('+', '');
            const trackingCode = userId.substring(0, 8).toUpperCase();
            const prefilledMessage = encodeURIComponent(`START_${trackingCode}`);
            setWhatsappLink(`https://wa.me/${formatted}?text=${prefilledMessage}`);
          }
        }
      } catch (error) {
        console.error('Error loading WhatsApp settings:', error);
        toast.error('Failed to load WhatsApp settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [userId]);

  // Save phone number to database
  const savePhoneNumber = async () => {
    if (!userId || !phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return false;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ whatsapp_phone_number: phoneNumber })
        .eq('id', userId);

      if (error) throw error;

      // Update WhatsApp link with tracking
      const formatted = phoneNumber.replace(/\s+/g, '').replace('+', '');
      const trackingCode = userId.substring(0, 8).toUpperCase();
      const prefilledMessage = encodeURIComponent(`START_${trackingCode}`);
      setWhatsappLink(`https://wa.me/${formatted}?text=${prefilledMessage}`);

      toast.success('WhatsApp number saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving WhatsApp number:', error);
      toast.error('Failed to save WhatsApp number');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Generate QR code via edge function
  const generateQR = async () => {
    if (!userId || !phoneNumber.trim()) {
      toast.error('Please save a phone number first');
      return false;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-whatsapp-qr', {
        body: { 
          phoneNumber: phoneNumber.trim()
        }
      });

      if (error) throw error;

      if (data?.qrUrl) {
        setQrUrl(data.qrUrl);
        toast.success('QR code generated successfully');
        return true;
      } else {
        throw new Error('No QR URL returned');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
      return false;
    } finally {
      setGenerating(false);
    }
  };

  return {
    phoneNumber,
    setPhoneNumber,
    qrUrl,
    whatsappLink,
    loading,
    saving,
    generating,
    savePhoneNumber,
    generateQR
  };
}
