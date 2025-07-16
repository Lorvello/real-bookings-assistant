export type UserType = 'trial' | 'expired_trial' | 'subscriber' | 'canceled_subscriber' | 'unknown';

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
}

export interface AccessControl {
  canViewDashboard: boolean;
  canCreateBookings: boolean;
  canEditBookings: boolean;
  canManageSettings: boolean;
  canAccessWhatsApp: boolean;
  canUseAI: boolean;
  canExportData: boolean;
  canInviteUsers: boolean;
  maxCalendars: number;
  maxBookingsPerMonth: number;
}