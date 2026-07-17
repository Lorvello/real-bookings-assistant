const ALLOWED_CHECKOUT_HOSTS = new Set([
  "bookingsassistant.com",
  "www.bookingsassistant.com",
  "localhost",
  "127.0.0.1",
]);

export function isAllowedCheckoutUrl(raw: string | undefined | null): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    const isLoopback = url.hostname === "localhost" ||
      url.hostname === "127.0.0.1";
    return (
      ALLOWED_CHECKOUT_HOSTS.has(url.hostname) &&
      (url.protocol === "https:" || (isLoopback && url.protocol === "http:"))
    );
  } catch {
    return false;
  }
}

export function resolveCheckoutOrigin(
  raw: string | undefined | null,
): string {
  if (!isAllowedCheckoutUrl(raw)) {
    return "https://bookingsassistant.com";
  }
  const url = new URL(raw!);
  return url.origin;
}
