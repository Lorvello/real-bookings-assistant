import * as React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SettingsSaveBarProps {
  /** There is a real local≠server diff to save. Drives visibility — NOT a one-shot
   *  "initialized" flag, so it can never hang invisible (fixes the E3 save-bar bug). */
  dirty: boolean;
  /** A save request is in flight. */
  saving?: boolean;
  /** Briefly true right after a successful save → shows the calm "Saved" morph. */
  justSaved?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  /** Resting label, e.g. "Unsaved changes". */
  label?: string;
  saveLabel?: string;
}

/**
 * The one calm Settings save affordance (PREMIUM_DESIGN_PLAYBOOK §6 Settings + §5
 * motion). A centred, frosted floating pill — NOT a full-width amber "you have
 * unsaved changes" alarm. Resting state is a quiet neutral line with an emerald
 * dot; after a save it morphs to "Saved ✓" and fades away. Driven purely by the
 * real dirty diff so it always appears when (and only when) there is something to
 * save.
 */
export function SettingsSaveBar({
  dirty,
  saving,
  justSaved,
  onSave,
  onDiscard,
  label = 'Unsaved changes',
  saveLabel = 'Save changes',
}: SettingsSaveBarProps) {
  const showSaved = !!justSaved && !dirty;
  const show = dirty || showSaved;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      aria-live="polite"
    >
      <div
        className={cn(
          'glass flex items-center gap-3 rounded-full border border-white/[0.10] py-2 pl-5 pr-2 transition-[opacity,transform] duration-300 ease-out',
          show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
          show && 'pointer-events-auto',
        )}
      >
        {showSaved ? (
          <span className="flex items-center gap-2 px-1 py-1 text-sm font-medium text-success-foreground">
            <Check className="h-4 w-4" aria-hidden="true" />
            Saved
          </span>
        ) : (
          <>
            <span className="flex items-center gap-2 whitespace-nowrap pr-1 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              {label}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                onClick={onDiscard}
                disabled={saving}
                className="text-muted-foreground hover:text-foreground"
              >
                Discard
              </Button>
              <Button
                onClick={onSave}
                loading={saving}
                className="rounded-full px-5"
              >
                {saveLabel}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
