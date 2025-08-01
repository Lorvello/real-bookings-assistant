
export type UserType = 'trial' | 'expired_trial' | 'subscriber' | 'canceled_subscriber' | 'canceled_and_inactive' | 'setup_incomplete' | 'unknown';

export interface UserStatus {
  userType: UserType;
  isTrialActive: boolean;
  isExpired: boolean;
  isSubscriber: boolean;
  isCanceled: boolean;
  hasFullAccess: boolean;
  daysRemaining: number;
  subscriptionEndDate?: Date;
  trialEndDate?: Date;
  gracePeriodActive: boolean;
  needsUpgrade: boolean;
  canEdit: boolean;
  canCreate: boolean;
  showUpgradePrompt: boolean;
  statusMessage: string;
  statusColor: 'green' | 'yellow' | 'red' | 'gray';
  isSetupIncomplete: boolean;
}

export interface AccessControl {
  canViewDashboard: boolean;
  canCreateBookings: boolean;
  canEditBookings: boolean;
  canManageSettings: boolean;
  canAccessWhatsApp: boolean;
  canAccessBookingAssistant: boolean;
  canUseAI: boolean;
  canExportData: boolean;
  canInviteUsers: boolean;
  canAccessAPI: boolean;
  canUseWhiteLabel: boolean;
  hasPrioritySupport: boolean;
  canAccessFutureInsights: boolean;
  canAccessBusinessIntelligence: boolean;
  canAccessPerformance: boolean;
  canAccessCustomerSatisfaction: boolean;
  canAccessTeamMembers: boolean;
  maxCalendars: number | null;
  maxBookingsPerMonth: number | null;
  maxTeamMembers: number;
  maxWhatsAppContacts: number | null;
}
