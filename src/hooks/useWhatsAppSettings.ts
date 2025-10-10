import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PLATFORM_WHATSAPP_NUMBER = '+15551766290';

export function useWhatsAppSettings(userId: string) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrExists, setQrExists] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);

  // Load settings from users table and auto-migrate legacy SVG
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
          const isSvg = data.whatsapp_qr_url?.endsWith('.svg');
          const hasQr = !!data.whatsapp_qr_url;
          
          setQrUrl(data.whatsapp_qr_url || null);
          setQrExists(hasQr);
          setNeedsMigration(isSvg);
          
          // Generate WhatsApp link with platform number and tracking code
          const formatted = PLATFORM_WHATSAPP_NUMBER.replace(/\s+/g, '').replace('+', '');
          const trackingCode = userId.substring(0, 8).toUpperCase();
          
          // Haal business_name op
          const { data: userData } = await supabase
            .from('users')
            .select('business_name')
            .eq('id', userId)
            .single();

          const businessName = userData?.business_name || 'Ons bedrijf';
          const prefilledMessage = `👋 Hallo ${businessName}!\n(Verstuur dit bericht om de chat op te slaan, dan kun je altijd via WhatsApp een afspraak maken.)`;
          setWhatsappLink(`https://wa.me/${formatted}?text=${encodeURIComponent(prefilledMessage)}`);

          // One-time auto refresh of stored PNG so it matches the new message
          try {
            const refreshKey = `qrRefreshed-${userId}`;
            if (hasQr && !isSvg && !sessionStorage.getItem(refreshKey)) {
              const { data: regen } = await supabase.functions.invoke('generate-whatsapp-qr', {
                body: { refresh: true }
              });
              if (regen?.qrUrl) setQrUrl(regen.qrUrl);
              sessionStorage.setItem(refreshKey, '1');
              console.log('QR auto-refreshed to latest message');
            }
          } catch (e) {
            console.warn('QR auto-refresh failed', e);
          }

          // Auto-migrate legacy SVG to PNG
          if (isSvg) {
            console.log('Legacy SVG QR detected, triggering migration...');
            try {
              const { data: migrateData, error: migrateError } = await supabase.functions.invoke('generate-whatsapp-qr', {
                body: {}
              });

              if (migrateError) throw migrateError;

              if (migrateData?.qrUrl) {
                setQrUrl(migrateData.qrUrl);
                setQrExists(true);
                setNeedsMigration(false);
                toast.success('QR code migrated to new format');
              }
            } catch (error) {
              console.error('Error migrating QR code:', error);
              toast.error('Failed to migrate QR code');
            }
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

  // Generate QR code via edge function (only once, or repair if broken)
  const generateQR = async (options?: { repair?: boolean }) => {
    if (!userId) {
      toast.error('User ID is required');
      return false;
    }

    // Allow regeneration even if a QR exists (we use refresh on the backend)

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-whatsapp-qr', {
        body: { refresh: true }
      });

      if (error) throw error;

      if (data?.qrUrl) {
        setQrUrl(data.qrUrl);
        setQrExists(true);
        setNeedsMigration(false);
        toast.success(options?.repair ? 'QR code repaired successfully' : data.alreadyExists ? 'QR code already exists' : 'QR code generated successfully');
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
    qrExists,
    needsMigration,
    generateQR
  };
}
