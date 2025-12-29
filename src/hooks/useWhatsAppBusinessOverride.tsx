import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface SetBusinessOverrideParams {
  contactId: string;
  businessName: string;
}

export function useSetBusinessOverride() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ contactId, businessName }: SetBusinessOverrideParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Upsert override
      const { error } = await supabase
        .from('whatsapp_contact_business_overrides')
        .upsert(
          {
            contact_id: contactId,
            business_name: businessName,
            created_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'contact_id' }
        );

      if (error) throw error;

      // Refresh overview to reflect change
      const { error: refreshError } = await supabase.rpc('refresh_whatsapp_contact_overview');
      if (refreshError) throw refreshError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-overview'] });
      toast({
        title: 'Business opgeslagen',
        description: 'De business koppeling is opgeslagen en blijft behouden.',
      });
    },
    onError: (error) => {
      console.error('Failed to set business override:', error);
      toast({
        title: 'Fout',
        description: 'Kon de business niet opslaan.',
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveBusinessOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('whatsapp_contact_business_overrides')
        .delete()
        .eq('contact_id', contactId);

      if (error) throw error;

      // Refresh overview
      const { error: refreshError } = await supabase.rpc('refresh_whatsapp_contact_overview');
      if (refreshError) throw refreshError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-overview'] });
      toast({
        title: 'Override verwijderd',
        description: 'De handmatige business koppeling is verwijderd.',
      });
    },
    onError: (error) => {
      console.error('Failed to remove business override:', error);
      toast({
        title: 'Fout',
        description: 'Kon de override niet verwijderen.',
        variant: 'destructive',
      });
    },
  });
}
