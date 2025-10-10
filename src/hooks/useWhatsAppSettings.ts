import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PLATFORM_WHATSAPP_NUMBER = '+31612345678';

export function useWhatsAppSettings(userId: string) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Load settings from users table
  useEffect(() => {
    const loadSettings = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('whatsapp_qr_url')
          .eq('id', userId)
          .single();

        if (error) throw error;

        if (data) {
          setQrUrl(data.whatsapp_qr_url || null);
          
          // Generate WhatsApp link with platform number and tracking code
          const formatted = PLATFORM_WHATSAPP_NUMBER.replace(/\s+/g, '').replace('+', '');
          const trackingCode = userId.substring(0, 8).toUpperCase();
          const prefilledMessage = `START_${trackingCode}`;
          setWhatsappLink(`https://wa.me/${formatted}?text=${prefilledMessage}`);
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

  // Generate QR code via edge function
  const generateQR = async () => {
    if (!userId) {
      toast.error('User ID is required');
      return false;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-whatsapp-qr', {
        body: {}
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
    platformNumber: PLATFORM_WHATSAPP_NUMBER,
    qrUrl,
    whatsappLink,
    loading,
    generating,
    generateQR
  };
}
