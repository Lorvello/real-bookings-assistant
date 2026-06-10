import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Route guard: requires an authenticated user. While auth is resolving we
 * render nothing (avoids a flash of protected content); unauthenticated users
 * are redirected to /login. Use to wrap internal/admin routes that must never
 * render for anonymous visitors.
 */
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
