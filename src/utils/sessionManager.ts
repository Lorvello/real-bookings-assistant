// Session management utility for tracking and controlling user sessions
// Implements session creation, validation, termination, and device trust

import { supabase } from '@/integrations/supabase/client';
import { DeviceFingerprint } from './deviceFingerprint';

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_fingerprint: string | null;
  device_name: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  location_country: string | null;
  location_city: string | null;
  last_activity_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export class SessionManager {
  /**
   * Create a new session for a user
   */
  static async createSession(
    userId: string, 
    deviceInfo: DeviceFingerprint
  ): Promise<string> {
    try {
      // Generate unique session token
      const sessionToken = crypto.randomUUID();
      
      // Session expires in 30 minutes
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          device_fingerprint: deviceInfo.fingerprint,
          device_name: deviceInfo.device_name,
          device_type: deviceInfo.device_type,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Store session token in sessionStorage
      sessionStorage.setItem('session_token', sessionToken);

      return sessionToken;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getActiveSessions(userId: string): Promise<UserSession[]> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('last_activity_at', { ascending: false });

      if (error) throw error;

      return (data || []) as UserSession[];
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      throw error;
    }
  }

  /**
   * Terminate a specific session
   */
  static async terminateSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;

      // Clear session token if it's the current session
      const currentToken = sessionStorage.getItem('session_token');
      const { data } = await supabase
        .from('user_sessions')
        .select('session_token')
        .eq('id', sessionId)
        .single();

      if (data?.session_token === currentToken) {
        sessionStorage.removeItem('session_token');
      }
    } catch (error) {
      console.error('Failed to terminate session:', error);
      throw error;
    }
  }

  /**
   * Terminate all sessions for a user except optionally the current one
   */
  static async terminateAllSessions(
    userId: string, 
    exceptCurrent: boolean = false
  ): Promise<void> {
    try {
      const currentToken = exceptCurrent ? sessionStorage.getItem('session_token') : null;

      let query = supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (currentToken) {
        query = query.neq('session_token', currentToken);
      }

      const { error } = await query;

      if (error) throw error;

      if (!exceptCurrent) {
        sessionStorage.removeItem('session_token');
      }
    } catch (error) {
      console.error('Failed to terminate all sessions:', error);
      throw error;
    }
  }

  /**
   * Validate a session token
   */
  static async validateSession(sessionToken: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('expires_at, is_active')
        .eq('session_token', sessionToken)
        .single();

      if (error || !data) return false;

      const isExpired = new Date(data.expires_at) < new Date();
      return data.is_active && !isExpired;
    } catch (error) {
      console.error('Failed to validate session:', error);
      return false;
    }
  }

  /**
   * Update session activity timestamp
   */
  static async updateSessionActivity(sessionToken: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ 
          last_activity_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // Extend for 30 more minutes
        })
        .eq('session_token', sessionToken);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update session activity:', error);
    }
  }

  /**
   * Trust a device for a user
   */
  static async trustDevice(userId: string, fingerprint: string): Promise<void> {
    try {
      const { data: settings } = await supabase
        .from('user_security_settings')
        .select('trusted_devices')
        .eq('user_id', userId)
        .single();

      const trustedDevices = (settings?.trusted_devices as string[]) || [];
      
      if (!trustedDevices.includes(fingerprint)) {
        trustedDevices.push(fingerprint);
        
        const { error } = await supabase
          .from('user_security_settings')
          .update({ trusted_devices: trustedDevices })
          .eq('user_id', userId);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to trust device:', error);
      throw error;
    }
  }

  /**
   * Check if a device is trusted
   */
  static async isDeviceTrusted(userId: string, fingerprint: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('user_security_settings')
        .select('trusted_devices')
        .eq('user_id', userId)
        .single();

      const trustedDevices = (data?.trusted_devices as string[]) || [];
      return trustedDevices.includes(fingerprint);
    } catch (error) {
      console.error('Failed to check device trust:', error);
      return false;
    }
  }

  /**
   * Remove a trusted device
   */
  static async removeTrustedDevice(userId: string, fingerprint: string): Promise<void> {
    try {
      const { data: settings } = await supabase
        .from('user_security_settings')
        .select('trusted_devices')
        .eq('user_id', userId)
        .single();

      const trustedDevices = ((settings?.trusted_devices as string[]) || []).filter(
        (fp: string) => fp !== fingerprint
      );

      const { error } = await supabase
        .from('user_security_settings')
        .update({ trusted_devices: trustedDevices })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to remove trusted device:', error);
      throw error;
    }
  }
}
