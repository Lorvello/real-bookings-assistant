import { useEffect } from 'react';

/**
 * Registers a browser `beforeunload` prompt while `isDirty` is true, so a tenant
 * who refreshes, closes the tab, or navigates away externally with unsaved
 * settings is warned before losing them.
 *
 * Extracted from UserManagement (which was the ONLY floating-SaveBar surface that
 * guarded) so every SettingsSaveBar surface (AI Knowledge, Operations, Users)
 * protects unsaved changes consistently.
 *
 * NOTE: `beforeunload` covers browser-level navigation only. In-app React Router
 * navigation (clicking a sidebar link) is NOT blocked here; a "discard changes?"
 * confirm dialog (via `useBlocker`) is a deliberate UX decision left to a future
 * round, not silently added.
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
