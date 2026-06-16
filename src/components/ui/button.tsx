
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // PLAYBOOK §4: press feedback (active:scale), a real full-opacity offset focus ring,
  // tight ease-out transition on transform/color/filter. Weight 500, not 600.
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-[transform,background-color,box-shadow,filter,border-color] duration-150 active:scale-[0.97] motion-reduce:active:scale-100 motion-reduce:transition-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // ELEVATION §2 — the accent GLOWS: directional gradient (lighter at top, /85 so the
        // ramp is actually visible) + inner top-highlight + a soft outer accent glow that
        // intensifies on hover.
        default: "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-[inset_0_1px_0_0_hsl(var(--highlight)/0.18),0_2px_10px_-2px_hsl(var(--primary)/0.45)] hover:brightness-110 hover:shadow-[inset_0_1px_0_0_hsl(var(--highlight)/0.22),0_4px_18px_-2px_hsl(var(--primary)/0.55)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.10)] hover:brightness-110",
        outline:
          "border border-white/[0.08] bg-transparent text-foreground hover:bg-white/[0.06] hover:border-white/[0.12]",
        secondary:
          "bg-secondary text-secondary-foreground border border-white/[0.06] hover:bg-white/[0.06]",
        ghost: "text-foreground hover:bg-white/[0.06]",
        link: "text-accent-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** show a spinner that replaces the label WITHOUT layout shift, and block clicks */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // With asChild we cannot inject a spinner sibling (Slot expects a single child),
    // so the loading affordance only applies to the real <button>.
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {/* Spinner overlays the centre; the label stays mounted but invisible so the
            button keeps its exact width/height (MEGA_PLAN §3 — no layout shift). The
            label is hidden from AT while busy and a polite live region announces it. */}
        {loading && (
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <span className="sr-only" aria-live="polite">Loading…</span>
          </span>
        )}
        <span
          aria-hidden={loading || undefined}
          className={cn("inline-flex items-center justify-center", loading && "opacity-0")}
        >
          {children}
        </span>
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
