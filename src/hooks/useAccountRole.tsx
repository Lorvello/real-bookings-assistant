import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AccountRole {
  isAccountOwner: boolean;
  accountOwnerId: string | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

interface AccountRoleData {
  isAccountOwner: boolean;
  accountOwnerId: string;
}

export const useAccountRole = (): AccountRole => {
  const { user } = useAuth();
  const query = useQuery<AccountRoleData, Error>({
    queryKey: ['account-role', user?.id],
    enabled: Boolean(user),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user) {
        throw new Error('An authenticated user is required to resolve the account role.');
      }

      const { data, error } = await supabase
        .from('users')
        .select('account_owner_id')
        .eq('id', user.id)
        .single();

      if (error) {
        throw new Error(error.message || 'Could not resolve the account role.');
      }

      const isAccountOwner = data.account_owner_id === null;
      return {
        isAccountOwner,
        accountOwnerId: data.account_owner_id || user.id,
      };
    },
  });

  if (!user) {
    return {
      isAccountOwner: false,
      accountOwnerId: null,
      loading: false,
      error: null,
      retry: () => undefined,
    };
  }

  return {
    isAccountOwner: query.data?.isAccountOwner ?? false,
    accountOwnerId: query.data?.accountOwnerId ?? null,
    loading: query.isPending || (query.isFetching && !query.data),
    error: query.error ?? null,
    retry: () => {
      void query.refetch();
    },
  };
};
