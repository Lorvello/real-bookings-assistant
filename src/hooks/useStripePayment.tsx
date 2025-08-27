import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

export const useStripePayment = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createPayment = async (bookingId: string, calendarId: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-booking-payment', {
        body: {
          booking_id: bookingId,
          calendar_id: calendarId,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Payment creation failed');
      }

      return {
        success: true,
        client_secret: data.client_secret,
        payment_intent_id: data.payment_intent_id,
      };
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: "Betalingsfout",
        description: error.message || "Er is een fout opgetreden bij het aanmaken van de betaling",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (
    clientSecret: string,
    paymentMethod: any,
    publishableKey: string
  ) => {
    setLoading(true);
    
    try {
      const stripe = await loadStripe(publishableKey);
      
      if (!stripe) {
        throw new Error('Stripe niet geladen');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: paymentMethod,
        }
      );

      if (error) {
        throw error;
      }

      if (paymentIntent?.status === 'succeeded') {
        toast({
          title: "Betaling geslaagd",
          description: "Uw betaling is succesvol verwerkt",
        });
        return { success: true, paymentIntent };
      } else {
        throw new Error('Betaling niet geslaagd');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        title: "Betalingsfout",
        description: error.message || "Er is een fout opgetreden bij het verwerken van de betaling",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createPayment,
    processPayment,
  };
};