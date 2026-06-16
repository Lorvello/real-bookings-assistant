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
          "flex h-9 w-full rounded-md border border-white/[0.08] bg-muted px-3 py-1 text-sm transition-[border-color,box-shadow] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-subtle-foreground focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:shadow-[0_0_18px_-2px_hsl(var(--primary)/0.30)] disabled:cursor-not-allowed disabled:opacity-50",
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
