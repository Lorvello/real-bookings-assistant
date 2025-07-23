
import { useAuth } from './useAuth';
import { getEnvironmentConfig } from '@/utils/environment';

// Developer emails list - can be extended with environment variables
const DEVELOPER_EMAILS = [
  'developer@example.com',
  'admin@example.com',
  // Add more developer emails as needed
];

export const useDeveloperAccess = () => {
  const { user } = useAuth();

  const isDeveloper = () => {
    const { allowDeveloperTools, isProduction } = getEnvironmentConfig(user?.email);
    
    // NEVER show developer tools in production, regardless of email
    if (isProduction) {
      return false;
    }
    
    // In development, only show for specific conditions
    if (!allowDeveloperTools) {
      return false;
    }
    
    if (!user?.email) return false;
    
    // Check if user email is in developer list
    if (DEVELOPER_EMAILS.includes(user.email)) {
      return true;
    }
    
    // Check if user email ends with development domain
    if (user.email.endsWith('@brandevolves.com') || user.email.endsWith('@dev.local')) {
      return true;
    }
    
    return false;
  };

  return {
    isDeveloper: isDeveloper(),
    user
  };
};
