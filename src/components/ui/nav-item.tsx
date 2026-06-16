import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

/**
 * DESIGN_SPEC §7.5 — sidebar nav item. The "spine" of the app shell.
 * rest = tertiary text; hover = faint white wash; active = accent wash + soft glow +
 * lit text + a left accent bar (ELEVATION §2: active states get a wash AND a glow, not
 * just a tint). `collapsed` renders icon-only. Use `asChild` to wrap a router <Link>.
 */
export interface NavItemProps extends React.HTMLAttributes<HTMLElement> {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  asChild?: boolean;
}

export const NavItem = React.forwardRef<HTMLElement, NavItemProps>(
  ({ icon, label, active = false, collapsed = false, asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref as React.Ref<HTMLButtonElement>}
        data-active={active}
        title={collapsed ? label : undefined}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none transition-[background-color,color,box-shadow] duration-150",
          "text-subtle-foreground hover:bg-white/[0.05] hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1",
          active &&
            "bg-primary/[0.12] text-foreground shadow-[0_0_24px_-10px_hsl(var(--primary)/0.55)] hover:bg-primary/[0.14]",
          collapsed && "justify-center px-0",
          className,
        )}
        {...props}
      >
        {/* left accent bar on active */}
        {active ? (
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
        ) : null}
        {icon ? (
          <span
            className={cn(
              "[&_svg]:h-[18px] [&_svg]:w-[18px] shrink-0",
              active ? "text-accent-foreground" : "text-current",
            )}
          >
            {icon}
          </span>
        ) : null}
        {!collapsed ? <span className="truncate">{label}</span> : null}
      </Comp>
    );
  },
);
NavItem.displayName = "NavItem";
