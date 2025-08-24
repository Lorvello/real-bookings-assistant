import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AccountRole {
  isAccountOwner: boolean;
  accountOwnerId: string | null;
  loading: boolean;
}

export const useAccountRole = () => {
  const { user } = useAuth();
  const [accountRole, setAccountRole] = useState<AccountRole>({
    isAccountOwner: false,
    accountOwnerId: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setAccountRole({
        isAccountOwner: false,
        accountOwnerId: null,
        loading: false,
      });
      return;
    }

    const fetchAccountRole = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('account_owner_id')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching account role:', error);
          return;
        }

        const isAccountOwner = data.account_owner_id === null;
        const accountOwnerId = data.account_owner_id || user.id;

        console.log('[ACCOUNT ROLE] Setting account role:', {
          isAccountOwner,
          accountOwnerId,
          userId: user.id
        });

        setAccountRole({
          isAccountOwner,
          accountOwnerId,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching account role:', error);
        setAccountRole(prev => ({ ...prev, loading: false }));
      }
    };

    fetchAccountRole();
  }, [user]);

  return accountRole;
};