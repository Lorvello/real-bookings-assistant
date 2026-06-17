// Single source of truth for the platform's WhatsApp number on the frontend.
// This is the ONE number every customer messages (the shared Bookingsassistant
// WABA number, matching the WHATSAPP_NUMBER edge secret + phone id
// 1204872446033001). The old +31852502132 was a stale number not wired to the
// webhook. Anything in the app that shows or links to the platform number must
// import from here so a number change never drifts across files.

/** E.164, no spaces. Use for wa.me / links / comparisons. */
export const PLATFORM_WHATSAPP_NUMBER = '+31851155243';

/** Human-friendly grouping for display in the UI. */
export const PLATFORM_WHATSAPP_DISPLAY = '+31 85 115 5243';

/** The product-facing name of that number, shown to business owners. */
export const PLATFORM_WHATSAPP_LABEL = 'WhatsApp Bookingsassistant';
