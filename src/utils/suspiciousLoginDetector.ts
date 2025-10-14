// Suspicious login detection system with risk scoring
// Analyzes login attempts for anomalies and security threats

import { supabase } from '@/integrations/supabase/client';

export interface LoginAttempt {
  ip_address: string;
  user_agent: string;
  device_fingerprint: string;
  location_country?: string;
  location_city?: string;
}

export interface LoginRiskAssessment {
  risk_score: number; // 0-100
  is_suspicious: boolean;
  risk_factors: string[];
  recommended_action: 'allow' | 'challenge' | 'block';
}

interface LoginPattern {
  typical_login_hours: number[];
  familiar_locations: string[];
  familiar_devices: string[];
  usual_countries: string[];
  last_login_location?: string;
  last_login_time?: Date;
}

export class SuspiciousLoginDetector {
  /**
   * Analyze a login attempt for suspicious activity
   */
  static async analyzeLoginAttempt(
    userId: string,
    currentLogin: LoginAttempt
  ): Promise<LoginRiskAssessment> {
    try {
      let riskScore = 0;
      const riskFactors: string[] = [];

      // Get user's login patterns
      const patterns = await this.getUserLoginPatterns(userId);

      // Check for new device
      const newDeviceScore = await this.checkNewDevice(userId, currentLogin.device_fingerprint);
      if (newDeviceScore > 0) {
        riskScore += newDeviceScore;
        riskFactors.push('New device detected');
      }

      // Check for location change
      if (currentLogin.location_country) {
        const locationScore = await this.checkLocationChange(
          userId, 
          currentLogin.location_country,
          currentLogin.location_city
        );
        if (locationScore > 0) {
          riskScore += locationScore;
          riskFactors.push('Unusual location detected');
        }
      }

      // Check for time anomaly
      const timeScore = await this.checkTimeAnomaly(userId, new Date());
      if (timeScore > 0) {
        riskScore += timeScore;
        riskFactors.push('Unusual login time');
      }

      // Check for impossible travel
      if (patterns.last_login_location && currentLogin.location_city) {
        const velocityScore = await this.checkVelocityAnomaly(
          userId,
          currentLogin.location_city
        );
        if (velocityScore > 0) {
          riskScore += velocityScore;
          riskFactors.push('Impossible travel detected');
        }
      }

      // Check IP reputation (basic check)
      const ipScore = await this.checkIPReputation(currentLogin.ip_address);
      if (ipScore > 0) {
        riskScore += ipScore;
        riskFactors.push('Suspicious IP address');
      }

      // Check recent failed attempts
      const failedAttemptsScore = await this.checkFailedAttempts(userId);
      if (failedAttemptsScore > 0) {
        riskScore += failedAttemptsScore;
        riskFactors.push('Recent failed login attempts');
      }

      // Determine recommended action
      let recommendedAction: 'allow' | 'challenge' | 'block';
      if (riskScore >= 61) {
        recommendedAction = 'block';
      } else if (riskScore >= 31) {
        recommendedAction = 'challenge';
      } else {
        recommendedAction = 'allow';
      }

      return {
        risk_score: Math.min(100, riskScore),
        is_suspicious: riskScore >= 31,
        risk_factors: riskFactors,
        recommended_action: recommendedAction
      };
    } catch (error) {
      console.error('Failed to analyze login attempt:', error);
      // Default to safe action on error
      return {
        risk_score: 0,
        is_suspicious: false,
        risk_factors: [],
        recommended_action: 'allow'
      };
    }
  }

  /**
   * Check if device is new
   */
  static async checkNewDevice(userId: string, fingerprint: string): Promise<number> {
    try {
      const { data } = await supabase
        .from('login_history')
        .select('device_fingerprint')
        .eq('user_id', userId)
        .eq('device_fingerprint', fingerprint)
        .eq('success', true)
        .limit(1);

      return data && data.length > 0 ? 0 : 20;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check for unusual location
   */
  static async checkLocationChange(
    userId: string,
    country: string,
    city?: string
  ): Promise<number> {
    try {
      const { data } = await supabase
        .from('login_history')
        .select('location_country, location_city')
        .eq('user_id', userId)
        .eq('success', true)
        .order('login_time', { ascending: false })
        .limit(10);

      if (!data || data.length === 0) return 0;

      const countryCounts = data.filter(l => l.location_country === country).length;
      
      if (countryCounts === 0) {
        return 25; // New country
      }

      if (city) {
        const cityCounts = data.filter(l => l.location_city === city).length;
        if (cityCounts === 0) {
          return 15; // New city in familiar country
        }
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check for unusual login time
   */
  static async checkTimeAnomaly(userId: string, loginTime: Date): Promise<number> {
    try {
      const hour = loginTime.getHours();
      
      const { data } = await supabase
        .from('login_history')
        .select('login_time')
        .eq('user_id', userId)
        .eq('success', true)
        .order('login_time', { ascending: false })
        .limit(20);

      if (!data || data.length < 5) return 0; // Not enough data

      const typicalHours = data.map(l => new Date(l.login_time).getHours());
      const hourCounts = typicalHours.filter(h => Math.abs(h - hour) <= 2).length;

      // If this hour is unusual (less than 10% of logins)
      if (hourCounts / data.length < 0.1) {
        return 15;
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check for impossible travel (location change faster than physically possible)
   */
  static async checkVelocityAnomaly(userId: string, currentCity: string): Promise<number> {
    try {
      const { data } = await supabase
        .from('login_history')
        .select('login_time, location_city')
        .eq('user_id', userId)
        .eq('success', true)
        .order('login_time', { ascending: false })
        .limit(1);

      if (!data || data.length === 0 || !data[0].location_city) return 0;

      const lastLogin = new Date(data[0].login_time);
      const now = new Date();
      const hoursSinceLastLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);

      // If different city and less than 1 hour apart, likely impossible travel
      if (data[0].location_city !== currentCity && hoursSinceLastLogin < 1) {
        return 40;
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check IP reputation (basic implementation)
   */
  static async checkIPReputation(ipAddress: string): Promise<number> {
    // TODO: Integrate with IP reputation service (AbuseIPDB, IPQualityScore, etc.)
    // For now, just check if IP is in blocked list
    try {
      const { data } = await supabase
        .from('blocked_ips')
        .select('id')
        .eq('ip_address', ipAddress)
        .eq('permanent_block', true)
        .limit(1);

      return data && data.length > 0 ? 50 : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check for recent failed attempts
   */
  static async checkFailedAttempts(userId: string): Promise<number> {
    try {
      const { data } = await supabase
        .from('login_history')
        .select('id')
        .eq('user_id', userId)
        .eq('success', false)
        .gte('login_time', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(10);

      if (!data) return 0;

      if (data.length >= 5) return 30;
      if (data.length >= 3) return 20;
      if (data.length >= 1) return 10;

      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get user's login patterns
   */
  static async getUserLoginPatterns(userId: string): Promise<LoginPattern> {
    try {
      const { data } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', userId)
        .eq('success', true)
        .order('login_time', { ascending: false })
        .limit(50);

      if (!data || data.length === 0) {
        return {
          typical_login_hours: [],
          familiar_locations: [],
          familiar_devices: [],
          usual_countries: []
        };
      }

      const typicalHours = data.map(l => new Date(l.login_time).getHours());
      const locations = data.map(l => l.location_city).filter(Boolean);
      const devices = data.map(l => l.device_fingerprint).filter(Boolean);
      const countries = data.map(l => l.location_country).filter(Boolean);

      return {
        typical_login_hours: [...new Set(typicalHours)],
        familiar_locations: [...new Set(locations)],
        familiar_devices: [...new Set(devices)],
        usual_countries: [...new Set(countries)],
        last_login_location: data[0]?.location_city,
        last_login_time: new Date(data[0]?.login_time)
      };
    } catch (error) {
      console.error('Failed to get login patterns:', error);
      return {
        typical_login_hours: [],
        familiar_locations: [],
        familiar_devices: [],
        usual_countries: []
      };
    }
  }

  /**
   * Check if location is familiar
   */
  static async isLocationFamiliar(userId: string, location: string): Promise<boolean> {
    const patterns = await this.getUserLoginPatterns(userId);
    return patterns.familiar_locations.includes(location);
  }

  /**
   * Check if device is familiar
   */
  static async isDeviceFamiliar(userId: string, fingerprint: string): Promise<boolean> {
    const patterns = await this.getUserLoginPatterns(userId);
    return patterns.familiar_devices.includes(fingerprint);
  }
}
