import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';

/**
 * AVAILABILITY-INAPP-NAV-STILL-NOOP (IUX R52): `useUnsavedChangesWarning`'s
 * `beforeunload` guard (see src/hooks/useUnsavedChangesWarning.ts) only covers
 * BROWSER-level exits (tab close, refresh, URL bar); it structurally cannot
 * intercept in-app React Router navigation (e.g. clicking a sidebar link),
 * because `beforeunload` never fires for a client-side route change.
 *
 * This app uses a plain `<BrowserRouter>` (see src/App.tsx), NOT a data
 * router (`createBrowserRouter`/`RouterProvider`), so react-router-dom v6's
 * `useBlocker`/`unstable_useBlocker` is NOT available here; it throws
 * "useBlocker must be used within a data router" outside that setup. Verified
 * by reading src/App.tsx and grepping the whole codebase for any existing
 * `useBlocker` usage or an equivalent in-app-nav-guard pattern: none exists.
 *
 * Instead: a light, additive context. A "dirty" surface (e.g. Weekly-Hours in
 * DailyAvailability.tsx) registers a guard while it has unsaved changes.
 * Every in-app navigation path (sidebar nav, back-to-website, sign out, i.e.
 * anything that calls `navigate()`) routes through `guardedNavigate`, which,
 * if a guard is currently registered, intercepts the navigation, shows a
 * real confirm/discard dialog (rendered by the one provider at the app root,
 * reusing the existing shared `AlertDialog` primitive, the same pattern
 * ServiceTypesManager's delete-confirm already uses), and only proceeds if
 * the user chooses to leave. This is purely ADDITIVE: `beforeunload` keeps
 * covering the external/browser-level case unchanged.
 *
 * AVAILABILITY-CALENDARSWITCH-STILL-NOOP (IUX R53): `guardedNavigate` only
 * wraps actual `navigate()` calls. R52-verify found a 3rd exit path that
 * loses an unsaved Weekly-Hours change with zero warning: the calendar
 * switcher (`CalendarSwitcherSection.tsx` in the sidebar, ALSO
 * `CalendarSwitcher.tsx` used on the Availability page itself and several
 * other pages) changes `CalendarContext`'s selected calendar via
 * `selectCalendar`/`selectAllCalendars`, which is pure React state, NOT a
 * route change, so it was never routed through `guardedNavigate` and
 * structurally cannot be under a navigate()-only design. R53's exhaustive
 * audit (see IUX_r53.md) found the same failure class in two more places
 * that are also not route changes: the Weekly-Hours/Date-Overrides tab
 * switch (`AvailabilityTabs.tsx`, pure `activeTab` React state inside
 * `AvailabilityManager.tsx`, unmounts `DailyAvailability` on tab change) and
 * the idle-session-expiry auto-redirect (`AvailabilityManager.tsx`'s own
 * `useEffect` calling `navigate('/login')` directly, bypassing
 * `DashboardLayout`'s guarded handlers).
 *
 * Rather than keep bolting on a narrower `guardedX` wrapper per call site,
 * `guardedAction` below is the general primitive: any state change or side
 * effect that would blow away a dirty surface's local state can be wrapped
 * in it, not just `navigate()` calls. `guardedNavigate` is now a thin alias
 * of `guardedAction` (kept as a separate export so existing call sites
 * reading "guardedNavigate" as the navigation-flavoured entry point don't
 * need to change), so there is still exactly one guard mechanism, one
 * dialog, one registration API: never a second parallel guard.
 */

type PendingAction = () => void;

interface NavigationGuardContextValue {
  /** Register (or clear, by passing null) the active unsaved-changes guard.
   *  `onDiscard` is called if the user confirms "Leave": it should reset the
   *  dirty local state (mirroring the surface's own Discard button) so the
   *  action that follows doesn't immediately re-trigger the guard. */
  setGuard: (guard: { message?: string; onDiscard: () => void } | null) => void;
  /** Wrap any action that would blow away a dirty surface's local state (a
   *  route change, a calendar switch, a tab switch, an auth redirect, etc).
   *  Runs it immediately if no guard is active; otherwise shows the confirm
   *  dialog and only runs it if the user confirms leaving. This is the
   *  general primitive; `guardedNavigate` is a thin alias of it kept for the
   *  navigation call sites that already use that name. */
  guardedAction: (action: PendingAction) => void;
  /** Alias of `guardedAction`, kept for navigation call sites (sidebar nav,
   *  back-to-website, sign-out) that were written against this name in R52.
   *  Exactly the same function, not a second guard mechanism. */
  guardedNavigate: (action: PendingAction) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue | undefined>(undefined);

export function useNavigationGuard() {
  const ctx = useContext(NavigationGuardContext);
  if (!ctx) {
    throw new Error('useNavigationGuard must be used within a NavigationGuardProvider');
  }
  return ctx;
}

interface NavigationGuardProviderProps {
  children: ReactNode;
}

export function NavigationGuardProvider({ children }: NavigationGuardProviderProps) {
  const guardRef = useRef<{ message?: string; onDiscard: () => void } | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const setGuard = useCallback((guard: { message?: string; onDiscard: () => void } | null) => {
    guardRef.current = guard;
  }, []);

  const guardedAction = useCallback((action: PendingAction) => {
    if (!guardRef.current) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setDialogOpen(true);
  }, []);

  const handleConfirmLeave = useCallback(() => {
    const action = pendingActionRef.current;
    const guard = guardRef.current;
    setDialogOpen(false);
    pendingActionRef.current = null;
    // Discard first (resets the dirty surface's local state / reverts to
    // server truth), THEN run the pending action: mirrors the sticky bar's
    // own Discard button semantics, so leaving via this dialog behaves
    // identically to clicking Discard and then navigating/switching/etc.
    guard?.onDiscard();
    action?.();
  }, []);

  const handleStay = useCallback(() => {
    setDialogOpen(false);
    pendingActionRef.current = null;
  }, []);

  return (
    <NavigationGuardContext.Provider value={{ setGuard, guardedAction, guardedNavigate: guardedAction }}>
      {children}
      <UnsavedChangesNavDialog
        open={dialogOpen}
        onConfirmLeave={handleConfirmLeave}
        onStay={handleStay}
      />
    </NavigationGuardContext.Provider>
  );
}

// Split into its own component (rather than inline JSX above) so the
// AlertDialog import stays colocated with the one place it's used; the
// provider itself stays a plain state machine.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';

function UnsavedChangesNavDialog({
  open,
  onConfirmLeave,
  onStay,
}: {
  open: boolean;
  onConfirmLeave: () => void;
  onStay: () => void;
}) {
  const { t } = useTranslation('settings');

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onStay(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('settings.common.unsavedChangesNavTitle', 'Leave without saving?')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'settings.common.unsavedChangesNavDescription',
              'You have unsaved changes. If you leave this page now, they will be lost.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay}>
            {t('settings.common.unsavedChangesNavStay', 'Stay on page')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmLeave} className="bg-destructive text-destructive-on">
            {t('settings.common.unsavedChangesNavLeave', 'Leave without saving')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
