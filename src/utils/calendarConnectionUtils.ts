
// Re-export all functions from the specialized modules for backward compatibility
export { fetchCalendarConnections, createPendingConnection } from './calendar/connectionManager';
export { getOAuthProvider } from './calendar/oauthProviders';
export { disconnectCalendarProvider, disconnectAllCalendarConnections } from './calendar/connectionDisconnect';
export { updateSetupProgress, checkRemainingConnections } from './calendar/setupProgressManager';
