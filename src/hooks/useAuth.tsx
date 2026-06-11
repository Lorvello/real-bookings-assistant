// Auth now lives in a single context provider. This re-export keeps the
// existing `@/hooks/useAuth` import path working for all consumers.
// See src/contexts/AuthContext.tsx for the implementation and AuthProvider.
export { useAuth, AuthProvider } from '@/contexts/AuthContext';
