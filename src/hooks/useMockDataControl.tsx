
import { useAuth } from './useAuth';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { getEnvironmentConfig } from '@/utils/environment';

export const useMockDataControl = () => {
  const { user } = useAuth();
  const { userStatus } = useUserStatus();
  
  const shouldUseMockData = () => {
    const { allowMockData } = getEnvironmentConfig(user?.email);

    // Mock/sample data is for LOCAL DEVELOPMENT only. We do NOT show fabricated numbers in
    // production — previously a setup-incomplete account saw fake revenue/customers that looked
    // real (and were unlabeled on 4 of 5 tabs, W3.2 audit #1). A setup-incomplete account now sees
    // honest empty/zero states; real numbers appear once a calendar + bookings exist.
    return allowMockData;
  };

  return {
    useMockData: shouldUseMockData(),
    isDeveloper: getEnvironmentConfig(user?.email).allowDeveloperTools,
    userStatus: userStatus.userType
  };
};
