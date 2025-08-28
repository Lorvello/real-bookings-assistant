import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppPaymentOptions {
  conversationId: string;
  serviceTypeId: string;
  paymentType?: 'full' | 'installment' | 'deposit';
  installmentPlan?: any;
}

export const useWhatsAppPaymentFlow = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createPaymentSession = async (options: WhatsAppPaymentOptions) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-payment-handler', {
        body: options,
      });

      if (error) {
        console.error('Error creating WhatsApp payment session:', error);
        throw error;
      }

      toast({
        title: "Payment link created",
        description: "Payment link has been generated for WhatsApp conversation.",
      });

      return data;
    } catch (error) {
      console.error('Error in WhatsApp payment flow:', error);
      toast({
        title: "Payment error",
        description: "Could not create payment session. Please try again.",
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