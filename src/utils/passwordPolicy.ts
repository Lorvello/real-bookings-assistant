// Password policy enforcement and expiry management
// Implements 90-day password expiry and forced password changes

import { supabase } from '@/integrations/supabase/client';

export interface PasswordPolicyCheck {
  isExpired: boolean;
  daysUntilExpiry: number;
  requiresChange: boolean;
  canChangeNow: boolean;
  lastChangedAt: Date;
  expiryDate: Date;
}

/**
 * Check if user's password is expired or expiring soon
 */
export const checkPasswordExpiry = async (userId: string): Promise<PasswordPolicyCheck> => {
  try {
    const { data, error } = await supabase
      .from('user_security_settings')
      .select('password_changed_at, password_expiry_days, force_password_change')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Default to non-expired if settings not found
      return {
        isExpired: false,
        daysUntilExpiry: 90,
        requiresChange: false,
        canChangeNow: true,
        lastChangedAt: new Date(),
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      };
    }

    const lastChanged = new Date(data.password_changed_at);
    const expiryDays = data.password_expiry_days || 90;
    const expiryDate = new Date(lastChanged.getTime() + expiryDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isExpired: now > expiryDate || data.force_password_change,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      requiresChange: data.force_password_change || now > expiryDate,
      canChangeNow: true,
      lastChangedAt: lastChanged,
      expiryDate
    };
  } catch (error) {
    console.error('Failed to check password expiry:', error);
    throw error;
  }
};

/**
 * Calculate password age in days
 */
export const calculatePasswordAge = (lastChanged: Date): number => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastChanged.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Force password change for a user
 */
export const enforcePasswordChange = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_security_settings')
      .update({ force_password_change: true })
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to enforce password change:', error);
    throw error;
  }
};

/**
 * Update password changed timestamp
 */
export const updatePasswordChangedAt = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_security_settings')
      .update({ 
        password_changed_at: new Date().toISOString(),
        force_password_change: false 
      })
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to update password changed timestamp:', error);
    throw error;
  }
};

/**
 * Get password expiry warning message
 */
export const getPasswordExpiryWarning = (daysUntilExpiry: number): string | null => {
  if (daysUntilExpiry <= 0) {
    return 'Your password has expired. Please change it now.';
  } else if (daysUntilExpiry <= 7) {
    return `Your password will expire in ${daysUntilExpiry} days. Please change it soon.`;
  } else if (daysUntilExpiry <= 14) {
    return `Your password will expire in ${daysUntilExpiry} days.`;
  }
  return null;
};
