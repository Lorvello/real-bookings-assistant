import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isTestMode } from '@/utils/stripeConfig';

interface WhatsAppPaymentOptions {
  conversationId: string;
  serviceTypeId: string;
  paymentType?: 'full' | 'installment' | 'deposit';
  installmentPlan?: any;
}

export const useWhatsAppPaymentFlow = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('notifications');

  const createPaymentSession = async (options: WhatsAppPaymentOptions) => {
    setLoading(true);
    try {
      // whatsapp-payment-handler defaults testMode to false (= LIVE Stripe keys)
      // when omitted. Always send the current dashboard Stripe mode so this path
      // can never silently charge real money in a test/dev context.
      const { data, error } = await supabase.functions.invoke('whatsapp-payment-handler', {
        body: { ...options, testMode: isTestMode() },
      });

      if (error) {
        console.error('Error creating WhatsApp payment session:', error);
        throw error;
      }

      toast({
        title: t('whatsappPaymentFlow.linkCreatedTitle', "Payment link created"),
        description: t('whatsappPaymentFlow.linkCreatedDescription', "Payment link has been generated for WhatsApp conversation."),
      });

      return data;
    } catch (error) {
      console.error('Error in WhatsApp payment flow:', error);
      toast({
        title: t('whatsappPaymentFlow.errorTitle', "Payment error"),
        description: t('whatsappPaymentFlow.errorDescription', "Could not create payment session. Please try again."),
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPaymentSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_payment_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching payment session:', error);
      throw error;
    }
  };

  const updatePaymentStatus = async (sessionId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_payment_sessions')
        .update({ payment_status: status })
        .eq('id', sessionId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  };

  return {
    createPaymentSession,
    getPaymentSession,
    updatePaymentStatus,
    loading,
  };
};