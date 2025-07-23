
import { useAuth } from './useAuth';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { getEnvironmentConfig } from '@/utils/environment';

export const useMockDataControl = () => {
  const { user } = useAuth();
  const { userStatus } = useUserStatus();
  
  const shouldUseMockData = () => {
    const { allowMockData } = getEnvironmentConfig(user?.email);
    
    // Mock data conditions:
    // 1. Developer in development environment
    // 2. User with setup_incomplete status (trial users need some sample data)
    if (allowMockData) {
      return true;
    }
    
    // For setup_incomplete users, show mock data to help them understand the platform
    if (userStatus.isSetupIncomplete) {
      return true;
    }
    
    return false;
  };

  return {
    useMockData: shouldUseMockData(),
    isDeveloper: getEnvironmentConfig(user?.email).allowDeveloperTools,
    userStatus: userStatus.userType
  };
};
