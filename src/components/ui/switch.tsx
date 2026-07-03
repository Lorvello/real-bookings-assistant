import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // MEGA_PLAN §2.B: satisfying eased transition + a SOFT accent halo when on.
      // Calm (Linear/Stripe), not a loud "gamer" glow: the fill carries the state,
      // the halo is just a hint (toned from 12px/0.55 to 8px/0.30).
      // Mobile touch target (DoD §2, >=44px): the visible switch stays a calm 20px,
      // but a centered invisible `before:` overlay extends the TAP area to 44x44 on
      // touch widths (clicks on the pseudo hit the button). Absolute, so it never
      // affects layout/scrollWidth; `md:before:hidden` keeps desktop byte-identical.
      // IUX R63 polish: a switch with zero hover affordance reads as inert/less
      // interactive next to the rest of the app's buttons (which all have a
      // hover treatment). Added a subtle brightness lift on both states, same
      // calm register as the existing halo. Radix renders a real `disabled`
      // attribute (not just a class), so the browser already excludes a
      // disabled switch from :hover entirely -- no extra guard needed.
      "peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-[background-color,box-shadow] duration-200 before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] md:before:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 bg-white/[0.10] hover:bg-white/[0.16] data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_8px_-2px_hsl(var(--primary)/0.30)] data-[state=checked]:hover:shadow-[0_0_10px_-1px_hsl(var(--primary)/0.42)]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.10)] ring-0 transition-transform duration-150 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
