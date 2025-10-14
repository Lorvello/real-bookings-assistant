// Device fingerprinting utility for secure session management
// Generates unique device identifiers for tracking and trust management

import FingerprintJS from '@fingerprintjs/fingerprintjs';

export interface DeviceFingerprint {
  fingerprint: string; // Hash of all device data
  device_name: string; // Human-readable device name
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  screen_resolution: string;
  timezone: string;
  language: string;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  hardwareConcurrency: number;
}

let fpInstance: any = null;

/**
 * Initialize FingerprintJS library
 */
const initFingerprint = async () => {
  if (!fpInstance) {
    fpInstance = await FingerprintJS.load();
  }
  return fpInstance;
};

/**
 * Generate a unique device fingerprint
 */
export const generateDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
  try {
    const fp = await initFingerprint();
    const result = await fp.get();
    
    const deviceInfo = getDeviceInfo();
    const deviceType = detectDeviceType();
    const deviceName = generateDeviceName(deviceType, deviceInfo);

    return {
      fingerprint: result.visitorId,
      device_name: deviceName,
      device_type: deviceType,
      browser: detectBrowser(deviceInfo.userAgent),
      os: detectOS(deviceInfo.userAgent),
      screen_resolution: deviceInfo.screenResolution,
      timezone: deviceInfo.timezone,
      language: deviceInfo.language
    };
  } catch (error) {
    console.error('Failed to generate device fingerprint:', error);
    // Fallback to basic fingerprint
    const deviceInfo = getDeviceInfo();
    const fallbackFingerprint = hashFingerprint({
      userAgent: deviceInfo.userAgent,
      screen: deviceInfo.screenResolution,
      timezone: deviceInfo.timezone
    });
    
    return {
      fingerprint: fallbackFingerprint,
      device_name: 'Unknown Device',
      device_type: detectDeviceType(),
      browser: detectBrowser(deviceInfo.userAgent),
      os: detectOS(deviceInfo.userAgent),
      screen_resolution: deviceInfo.screenResolution,
      timezone: deviceInfo.timezone,
      language: deviceInfo.language
    };
  }
};

/**
 * Get device information from browser APIs
 */
export const getDeviceInfo = (): DeviceInfo => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: screen.colorDepth,
    hardwareConcurrency: navigator.hardwareConcurrency || 0
  };
};

/**
 * Detect device type from user agent
 */
const detectDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
  const ua = navigator.userAgent.toLowerCase();
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

/**
 * Detect browser from user agent
 */
const detectBrowser = (userAgent: string): string => {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('opera') || ua.includes('opr/')) return 'Opera';
  
  return 'Unknown';
};

/**
 * Detect operating system from user agent
 */
const detectOS = (userAgent: string): string => {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  
  return 'Unknown';
};

/**
 * Generate a human-readable device name
 */
const generateDeviceName = (deviceType: string, info: DeviceInfo): string => {
  const browser = detectBrowser(info.userAgent);
  const os = detectOS(info.userAgent);
  
  if (deviceType === 'mobile') {
    return `Mobile - ${os} ${browser}`;
  } else if (deviceType === 'tablet') {
    return `Tablet - ${os} ${browser}`;
  } else {
    return `${os} - ${browser}`;
  }
};

/**
 * Hash data to create fingerprint (fallback method)
 */
export const hashFingerprint = (data: any): string => {
  const str = JSON.stringify(data);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36);
};
