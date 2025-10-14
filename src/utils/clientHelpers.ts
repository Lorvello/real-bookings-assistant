/**
 * Get client IP address (approximation for browser environments)
 * Note: This is a best-effort approach as true IP detection requires server-side logic
 */
export async function getClientIp(): Promise<string | undefined> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return undefined;
  }
}

/**
 * Get user agent string
 */
export function getUserAgent(): string {
  return navigator.userAgent;
}
