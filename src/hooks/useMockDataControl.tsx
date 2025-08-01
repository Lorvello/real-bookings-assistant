
import { useAuth } from './useAuth';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { getEnvironmentConfig } from '@/utils/environment';

export const useMockDataControl = () => {
  const { user } = useAuth();
  const { userStatus } = useUserStatus();
  
  const shouldUseMockData = () => {
    const { allowMockData } = getEnvironmentConfig(user?.email);
    
    // Mock data conditions for developers:
    // 1. Developer in development environment (always show mock data)
    // 2. Any developer testing user status scenarios
    if (allowMockData) {
      return true;
    }
    
    // For setup_incomplete users, show mock data to help them understand the platform
    if (userStatus.isSetupIncomplete) {
      return true;
    }
    
    // For developer testing: show mock data for all status scenarios to prevent crashes
    const isDeveloperTesting = getEnvironmentConfig(user?.email).isDevelopment && user?.email;
    const testableStatuses: Array<typeof userStatus.userType> = [
      'trial', 'expired_trial', 'subscriber', 'canceled_subscriber', 'canceled_and_inactive', 'setup_incomplete'
    ];
    
    if (isDeveloperTesting && testableStatuses.includes(userStatus.userType)) {
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
