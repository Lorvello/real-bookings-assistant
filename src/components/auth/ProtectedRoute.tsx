import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isDeveloperEmail } from '@/utils/environment';

/**
 * Route guard: requires an authenticated user. While auth is resolving we
 * render nothing (avoids a flash of protected content); unauthenticated users
 * are redirected to /login. Use to wrap internal/admin routes that must never
 * render for anonymous visitors.
 *
 * Pass `requireDeveloper` for developer-only routes (e.g. /admin/*): a logged-in
 * non-developer is bounced to /dashboard. Server data stays protected by the
 * is_admin() RLS check; this only governs UI access.
 */
export const ProtectedRoute = ({
  children,
  requireDeveloper = false,
}: {
  children: ReactNode;
  requireDeveloper?: boolean;
}) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (requireDeveloper && !isDeveloperEmail(user.email)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
