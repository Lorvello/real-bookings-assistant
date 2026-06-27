import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface SettingsFieldProps {
  /** Field label. Optional so the wrapper can also frame a label-less control. */
  label?: React.ReactNode;
  /** Links the label to its control for a11y (set the same id on the input). */
  htmlFor?: string;
  /** Helper line under the label — the calm, explanatory voice (tertiary tier). */
  description?: React.ReactNode;
  /** Appends a subtle emerald asterisk. */
  required?: boolean;
  /** Appends a quiet "Optional" tag — premium products label optionality, not requiredness, loudly. */
  optional?: boolean;
  /** Inline validation error (destructive tier) shown under the control. */
  error?: string | null;
  /** Right-aligned helper under the control (e.g. a tabular char count). */
  hint?: React.ReactNode;
  className?: string;
  /** The control itself: <Input>, <Textarea>, a react-select, etc. */
  children: React.ReactNode;
}

/**
 * The one canonical Settings form-field wrapper (PREMIUM_DESIGN_PLAYBOOK §3c/§4).
 * Owns the label-over-control rhythm so every field across every tab shares one
 * spacing, label weight, description tier and error treatment — instead of each
 * tab hand-rolling `<label class="block text-sm ... mb-2">` + a raw input. Pair it
 * with the premium shadcn <Input>/<Textarea> (never a raw <input>) for the field.
 */
export function SettingsField({
  label,
  htmlFor,
  description,
  required,
  optional,
  error,
  hint,
  className,
  children,
}: SettingsFieldProps) {
  const { t } = useTranslation('settings');
  return (
    <div className={cn('space-y-2', className)}>
      {(label || description) && (
        <div className="space-y-1">
          {label && (
            <label
              htmlFor={htmlFor}
              className="flex items-center gap-1.5 text-[13px] font-medium leading-[18px] text-foreground"
            >
              <span>{label}</span>
              {required && <span className="text-primary" aria-hidden="true">*</span>}
              {optional && (
                <span className="text-xs font-normal text-subtle-foreground">{t('settings.common.optional', 'Optional')}</span>
              )}
            </label>
          )}
          {description && (
            <p className="text-xs leading-5 text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
      {(error || hint) && (
        <div className="flex items-start justify-between gap-3">
          {error ? (
            <p className="text-xs leading-5 text-destructive-foreground">{error}</p>
          ) : (
            <span aria-hidden="true" />
          )}
          {hint && (
            <p className="shrink-0 text-xs leading-5 tabular-nums text-subtle-foreground">{hint}</p>
          )}
        </div>
      )}
    </div>
  );
}
