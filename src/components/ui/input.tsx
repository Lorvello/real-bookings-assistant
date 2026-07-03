import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // MEGA_PLAN §3 input: muted surface, hairline border, premium focus = emerald
          // border tint + a soft halo BLOOM (not just a ring) so the field lights up,
          // tertiary placeholder. The blurred outer glow is the "bloom"; the inner ring
          // keeps the crisp focus boundary for a11y.
          // min-h-11 md:min-h-0 → >=44px tall on mobile (touch-target, DoD §2), desktop
          // byte-identical (md reset → h-9 wins). Height-only, so it CANNOT introduce
          // horizontal overflow on any surface (same safety property as the Button fix, A1b).
          // R43: aria-invalid was already wired by every validated Settings field
          // (business_email/phone, website, ...) but had no visual hook here, so an
          // invalid value looked identical to a normal one at rest (only the small
          // error text below revealed it, and that could get lost when it lands
          // behind the floating SettingsSaveBar). A destructive-tinted border at
          // rest, keeping the same bloom treatment on focus, makes the error state
          // readable without hunting for the caption text.
          "flex h-9 min-h-11 md:min-h-0 w-full rounded-md border border-white/[0.08] bg-muted px-3 py-1 text-sm transition-[border-color,box-shadow] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-subtle-foreground focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:shadow-[0_0_18px_-2px_hsl(var(--primary)/0.30)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive/50 aria-[invalid=true]:focus-visible:border-destructive/70 aria-[invalid=true]:focus-visible:ring-destructive/25 aria-[invalid=true]:focus-visible:shadow-[0_0_18px_-2px_hsl(var(--destructive)/0.30)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
