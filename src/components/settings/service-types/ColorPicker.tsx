import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The one canonical service/calendar colour palette. Shared so the picker renders
 *  the same swatches everywhere instead of two divergent copy-pasted lists. */
export const SERVICE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  colors?: string[];
}

/**
 * Premium swatch picker: a proper radiogroup with a white Check glyph rendered
 * inside the selected swatch (with a drop-shadow so it stays legible on light
 * colours) instead of the weak scale-bump + thin ring. One affordance, reused.
 */
export function ColorPicker({
  value,
  onChange,
  disabled = false,
  ariaLabel = 'Color',
  colors = SERVICE_COLORS,
}: ColorPickerProps) {
  const { t } = useTranslation('settings');
  return (
    <div className="flex flex-wrap gap-2 pt-0.5" role="radiogroup" aria-label={ariaLabel}>
      {colors.map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t('settings.services.colorPicker.swatchAriaLabel', 'Color {{color}}', { color })}
            onClick={() => onChange(color)}
            disabled={disabled}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50',
              selected
                ? 'border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)]'
                : 'border border-white/[0.12] hover:border-white/30'
            )}
            style={{ backgroundColor: color }}
          >
            {selected && (
              <Check className="h-4 w-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
