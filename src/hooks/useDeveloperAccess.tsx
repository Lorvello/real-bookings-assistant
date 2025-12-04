
import { useAuth } from './useAuth';
import { getEnvironmentConfig } from '@/utils/environment';

// Only this email has developer access
const DEVELOPER_EMAIL = 'business01003@gmail.com';

export const useDeveloperAccess = () => {
  const { user } = useAuth();

  const isDeveloper = () => {
    const { isProduction } = getEnvironmentConfig(user?.email);
    
    // NEVER show developer tools in production
    if (isProduction) {
      return false;
    }
    
    // Only allow the specific developer email
    return user?.email === DEVELOPER_EMAIL;
  };

  return {
    isDeveloper: isDeveloper(),
    user
  };
};
