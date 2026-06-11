
import { useAuth } from './useAuth';
import { isDeveloperEmail } from '@/utils/environment';

// Developer access is granted ONLY to the single developer account, in EVERY
// environment (including production), so the live site can be tested as a
// developer. The match is case-insensitive and works identically whether the
// session came from email/password or Google sign-in. See DEVELOPER_EMAIL in
// utils/environment.ts for the single source of truth.
export const useDeveloperAccess = () => {
  const { user } = useAuth();

  return {
    isDeveloper: isDeveloperEmail(user?.email),
    user,
  };
};
