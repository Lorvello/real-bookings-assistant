/**
 * Color Utilities - Centralized Color Management
 * 
 * This file provides color constants and utilities that reference
 * the Tailwind design system defined in tailwind.config.ts
 * 
 * IMPORTANT: Never hardcode hex values. Always use Tailwind class names.
 */

// Service Type Color Presets (Tailwind class names)
export const SERVICE_TYPE_COLORS = [
  'blue-500',
  'green-500',
  'purple-500',
  'orange-500',
  'pink-500',
  'yellow-500',
  'red-500',
  'indigo-500',
  'teal-500',
  'cyan-500',
] as const;

// Chart Color Presets (Tailwind class names)
export const CHART_COLORS = {
  primary: 'chart-blue',
  secondary: 'chart-green',
  tertiary: 'chart-purple',
  danger: 'chart-red',
  warning: 'chart-orange',
  info: 'chart-yellow',
} as const;

// Peak Hours Intensity Colors (Tailwind class names)
export const PEAK_HOURS_COLORS = {
  veryBusy: 'red-600',      // dc2626
  busy: 'orange-600',       // ea580c
  moderate: 'yellow-600',   // ca8a04
  quiet: 'green-600',       // 16a34a
  veryQuiet: 'slate-500',   // 64748b
} as const;

// Status Badge Colors (Tailwind class names)
export const STATUS_COLORS = {
  active: { bg: 'green-100', text: 'green-800' },
  closed: { bg: 'gray-100', text: 'gray-800' },
  archived: { bg: 'yellow-100', text: 'yellow-800' },
  unknown: { bg: 'gray-100', text: 'gray-600' },
} as const;

// Booking Status Colors (Tailwind class names)
export const BOOKING_STATUS_COLORS = {
  confirmed: { bg: 'blue-100', text: 'blue-800' },
  completed: { bg: 'green-100', text: 'green-800' },
  cancelled: { bg: 'red-100', text: 'red-800' },
  pending: { bg: 'yellow-100', text: 'yellow-800' },
  default: { bg: 'gray-100', text: 'gray-600' },
} as const;

/**
 * Get a color class name by index (useful for dynamic coloring)
 */
export function getColorByIndex(index: number): string {
  return SERVICE_TYPE_COLORS[index % SERVICE_TYPE_COLORS.length];
}

/**
 * Get intensity-based color for peak hours visualization
 */
export function getPeakHoursColor(count: number, maxCount: number): string {
  const intensity = count / maxCount;
  if (intensity > 0.8) return PEAK_HOURS_COLORS.veryBusy;
  if (intensity > 0.6) return PEAK_HOURS_COLORS.busy;
  if (intensity > 0.4) return PEAK_HOURS_COLORS.moderate;
  if (intensity > 0.2) return PEAK_HOURS_COLORS.quiet;
  return PEAK_HOURS_COLORS.veryQuiet;
}

/**
 * Convert Tailwind class name to hex (for libraries that require hex)
 */
export const TAILWIND_TO_HEX: Record<string, string> = {
  'blue-500': '#3b82f6',
  'green-500': '#22c55e',
  'green-600': '#16a34a',
  'purple-500': '#a855f7',
  'red-600': '#dc2626',
  'orange-600': '#ea580c',
  'yellow-600': '#ca8a04',
  'slate-500': '#64748b',
  'slate-400': '#94a3b8',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'chart-blue': '#3b82f6',
  'chart-green': '#10b981',
  'chart-purple': '#a855f7',
  'chart-red': '#dc2626',
  'chart-orange': '#ea580c',
  'chart-yellow': '#ca8a04',
} as const;

/**
 * Get hex value from Tailwind class name (for chart libraries)
 */
export function getHexFromTailwind(colorClass: string): string {
  return TAILWIND_TO_HEX[colorClass] || '#64748b'; // fallback to slate-500
}
