import { useState } from 'react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const installmentSettlementSchema = z.object({
  bookingId: z.string().uuid(),
});

interface SettlementResult {
  success: boolean;
  error?: string;
  payment_status?: string;
  idempotent_replay?: boolean;
}

export function useInstallmentSettlement(onSettled?: () => void) {
  const { t } = useTranslation('appPages');
  const { toast } = useToast();
  const [isSettling, setIsSettling] = useState(false);

  const settle = async (bookingId: string): Promise<boolean> => {
    const parsed = installmentSettlementSchema.safeParse({ bookingId });
    if (!parsed.success) {
      toast({
        variant: 'destructive',
        title: t('calPage.bookingDetail.actions.errorTitle', 'Action failed'),
        description: t('calPage.bookingDetail.actions.invalidInput', 'Invalid request. Please reload and try again.'),
      });
      return false;
    }

    setIsSettling(true);
    try {
      const { data, error } = await supabase.rpc('record_installment_balance_collected', {
        p_booking_id: parsed.data.bookingId,
      });
      if (error) {
        toast({
          variant: 'destructive',
          title: t('calPage.bookingDetail.actions.balanceErrorTitle', 'Could not record payment'),
          description: error.message,
        });
        return false;
      }

      const result = data as unknown as SettlementResult | null;
      if (!result?.success || result.payment_status !== 'paid') {
        toast({
          variant: 'destructive',
          title: t('calPage.bookingDetail.actions.balanceErrorTitle', 'Could not record payment'),
          description: result?.error ?? t('calPage.bookingDetail.actions.genericError', 'Could not update the booking.'),
        });
        return false;
      }

      toast({
        title: t('calPage.bookingDetail.actions.balanceSuccessTitle', 'Remaining payment recorded'),
        description: t('calPage.bookingDetail.actions.balanceSuccessBody', 'The appointment is now marked as fully paid.'),
      });
      onSettled?.();
      return true;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('calPage.bookingDetail.actions.balanceErrorTitle', 'Could not record payment'),
        description: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      setIsSettling(false);
    }
  };

  return { settle, isSettling };
}
