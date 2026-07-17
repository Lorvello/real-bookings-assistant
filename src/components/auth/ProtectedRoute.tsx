import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccountRole } from '@/hooks/useAccountRole';
import { isDeveloperEmail } from '@/utils/environment';

const RouteLoadingState = ({ children }: { children: ReactNode }) => (
  <div
    className="flex min-h-[12rem] items-center justify-center px-4 text-sm text-muted-foreground"
    role="status"
    aria-live="polite"
  >
    {children}
  </div>
);

const AccountOwnerRoute = ({ children }: { children: ReactNode }) => {
  const { isAccountOwner, loading, error, retry } = useAccountRole();

  if (loading) {
    return <RouteLoadingState>Checking account access…</RouteLoadingState>;
  }

  if (error) {
    return (
      <div
        className="mx-auto my-8 flex max-w-md flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-8 text-center"
        role="alert"
      >
        <p>We could not verify account access.</p>
        <button
          type="button"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium"
          onClick={retry}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!isAccountOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * Route guard: requires an authenticated user. While auth is resolving it
 * renders an announced loading state; unauthenticated users are redirected to
 * /login. Use to wrap internal/admin routes that must never render for anonymous
 * visitors.
 *
 * Pass `requireDeveloper` for developer-only routes (e.g. /admin/*): a logged-in
 * non-developer is bounced to /dashboard. Server data stays protected by the
 * is_admin() RLS check; this only governs UI access.
 *
 * Pass `requireAccountOwner` for owner-only routes. The guarded child stays
 * unmounted until the role query succeeds, so editor/viewer sessions cannot fire
 * owner-only effects while access is still unknown.
 */
export const ProtectedRoute = ({
  children,
  requireDeveloper = false,
  requireAccountOwner = false,
}: {
  children: ReactNode;
  requireDeveloper?: boolean;
  requireAccountOwner?: boolean;
}) => {
  const { user, loading } = useAuth();

  if (loading) return <RouteLoadingState>Checking your session…</RouteLoadingState>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireDeveloper && !isDeveloperEmail(user.email)) return <Navigate to="/dashboard" replace />;
  if (requireAccountOwner) return <AccountOwnerRoute>{children}</AccountOwnerRoute>;

  return <>{children}</>;
};

export default ProtectedRoute;
