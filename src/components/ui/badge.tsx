import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/10 text-accent-foreground",
        secondary:
          "border-white/[0.08] bg-white/[0.04] text-muted-foreground",
        destructive:
          "border-transparent bg-destructive/10 text-destructive-foreground",
        outline: "border-white/[0.12] text-foreground",
        // DESIGN_SPEC §1 status family — differentiate by hue intensity + icon/label,
        // never a competing cool color. confirmed=green, pending/attention=gold, error=red.
        success:
          "border-transparent bg-success/10 text-success-foreground",
        warning:
          "border-transparent bg-warning/10 text-warning-foreground",
        gold:
          "border-transparent bg-gold/10 text-gold-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
