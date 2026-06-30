import { useState } from 'react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// E-3 (sev-2): owner CANCEL + MARK-NO-SHOW actions from the dashboard.
// The mutation calls the server-side RPC owner_update_booking_status, which enforces
// team-aware account_owner_id ownership (no IDOR), the valid status transitions, and
// the no-auto-refund payment flag. The client never bypasses those guards: it only
// asks the RPC to act and surfaces the structured result. Slot freeing happens at the
// DB level via the bookings_no_overlap exclusion constraint.

// Only the two owner actions are accepted; validated before the network call so a
// malformed status never reaches the RPC (zod-validation-expert discipline).
export const ownerBookingActionSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(['cancelled', 'no-show']),
  reason: z.string().trim().max(500).optional(),
});

export type OwnerBookingAction = z.infer<typeof ownerBookingActionSchema>;

interface RpcResult {
  success: boolean;
  error?: string;
  message?: string;
  status?: string;
  payment_flagged_refund_required?: boolean;
}

export function useBookingActions(onActed?: () => void) {
  const { t } = useTranslation('appPages');
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<'cancelled' | 'no-show' | null>(null);

  const act = async (input: OwnerBookingAction): Promise<boolean> => {
    const parsed = ownerBookingActionSchema.safeParse(input);
    if (!parsed.success) {
      toast({
        variant: 'destructive',
        title: t('calPage.bookingDetail.actions.errorTitle', 'Action failed'),
        description: t('calPage.bookingDetail.actions.invalidInput', 'Invalid request. Please reload and try again.'),
      });
      return false;
    }

    const { bookingId, status, reason } = parsed.data;
    setPendingAction(status);
    try {
      const { data, error } = await supabase.rpc('owner_update_booking_status', {
        p_booking_id: bookingId,
        p_new_status: status,
        p_reason: reason ?? null,
      });

      // RLS / ownership denial (42501) surfaces as a Postgres error here.
      if (error) {
        toast({
          variant: 'destructive',
          title: t('calPage.bookingDetail.actions.errorTitle', 'Action failed'),
          description: error.message,
        });
        return false;
      }

      const result = data as unknown as RpcResult | null;
      if (!result?.success) {
        toast({
          variant: 'destructive',
          title: t('calPage.bookingDetail.actions.errorTitle', 'Action failed'),
          description:
            result?.message ??
            t('calPage.bookingDetail.actions.genericError', 'Could not update the booking.'),
        });
        return false;
      }

      const successMsg =
        status === 'cancelled'
          ? t('calPage.bookingDetail.actions.cancelled', 'Booking cancelled. The time slot is now free again.')
          : t('calPage.bookingDetail.actions.markedNoShow', 'Marked as no-show. The time slot is now free again.');

      toast({
        title: t('calPage.bookingDetail.actions.successTitle', 'Booking updated'),
        description: result.payment_flagged_refund_required
          ? `${successMsg} ${t('calPage.bookingDetail.actions.refundNote', 'This booking was paid; flagged for a manual refund decision.')}`
          : successMsg,
      });

      onActed?.();
      return true;
    } catch (e) {
      toast({
        variant: 'destructive',
        title: t('calPage.bookingDetail.actions.errorTitle', 'Action failed'),
        description: e instanceof Error ? e.message : String(e),
      });
      return false;
    } finally {
      setPendingAction(null);
    }
  };

  return {
    act,
    pendingAction,
    isActing: pendingAction !== null,
  };
}
