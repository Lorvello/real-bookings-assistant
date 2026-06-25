import type { StylesConfig } from 'react-select';

/**
 * One canonical react-select theme for the Settings tabs, driven entirely by the
 * design tokens (PREMIUM_DESIGN_PLAYBOOK §2/§4) instead of the old hard-coded
 * #111827 / #10B981 hexes that read off-brand and "cheap". Token strings work as
 * inline style values because the browser resolves CSS custom properties there.
 *   - control  = muted surface + hairline white-alpha border + emerald focus bloom
 *   - menu     = popover surface + hairline border + soft floating shadow
 *   - option   = neutral by default, white-alpha hover, emerald /0.16 selected wash
 * Matches the shadcn <Input>/<Select> styling so a searchable select sits flush
 * next to every other field on the page.
 */
/**
 * Factory so the control's min-height can be raised to 44px on mobile (touch-target,
 * DoD §2). react-select renders inline styles, so there is no Tailwind `md:` escape
 * hatch; the consumer keys this on `useIsMobile()` instead, which re-renders on resize.
 * Desktop keeps the original 40px (flush with the 36-40px shadcn fields beside it).
 */
export const makeSettingsSelectStyles = (
  opts?: { controlMinHeight?: number },
): StylesConfig<any, false> => ({
  control: (base, state) => ({
    ...base,
    minHeight: opts?.controlMinHeight ?? 40,
    backgroundColor: 'hsl(var(--muted))',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: state.isFocused ? 'hsl(var(--primary) / 0.6)' : 'hsl(0 0% 100% / 0.08)',
    boxShadow: state.isFocused ? '0 0 18px -2px hsl(var(--primary) / 0.30)' : 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    '&:hover': {
      borderColor: state.isFocused ? 'hsl(var(--primary) / 0.6)' : 'hsl(0 0% 100% / 0.16)',
    },
  }),
  valueContainer: (base) => ({ ...base, padding: '2px 10px' }),
  input: (base) => ({ ...base, color: 'hsl(var(--foreground))', margin: 0, padding: 0 }),
  singleValue: (base) => ({ ...base, color: 'hsl(var(--foreground))', fontSize: 14 }),
  placeholder: (base) => ({ ...base, color: 'hsl(var(--subtle-foreground))', fontSize: 14 }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(0 0% 100% / 0.08)',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 0 0 hsl(0 0% 100% / 0.06), 0 8px 24px -8px rgba(0,0,0,0.5)',
    zIndex: 60,
  }),
  menuList: (base) => ({ ...base, padding: 4 }),
  option: (base, state) => ({
    ...base,
    cursor: 'pointer',
    borderRadius: 6,
    fontSize: 14,
    padding: '8px 10px',
    color: state.isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
    backgroundColor: state.isSelected
      ? 'hsl(var(--primary) / 0.16)'
      : state.isFocused
        ? 'hsl(0 0% 100% / 0.05)'
        : 'transparent',
    ':active': { backgroundColor: 'hsl(var(--primary) / 0.20)' },
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'hsl(var(--subtle-foreground))',
    ':hover': { color: 'hsl(var(--foreground))' },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'hsl(var(--subtle-foreground))',
    ':hover': { color: 'hsl(var(--foreground))' },
  }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: 'hsl(0 0% 100% / 0.08)' }),
  noOptionsMessage: (base) => ({ ...base, color: 'hsl(var(--subtle-foreground))', fontSize: 14 }),
});

/** Back-compat default (desktop 40px control). New call sites should prefer the
 *  factory with a mobile-aware `controlMinHeight` from `useIsMobile()`. */
export const settingsSelectStyles = makeSettingsSelectStyles();
