

import { ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps {
  name: string;
  className: string;
  background: ReactNode;
  Icon: any;
  description: string;
  href: string;
  cta: string;
  hideCta?: boolean;
}

const BentoGrid = ({ children, className }: BentoGridProps) => {
  return (
    <div
      className={cn(
        // Mobile: 2 columns with smaller cards, Desktop: keep original 3-column bento layout
        "grid w-full gap-2 sm:gap-3 md:gap-4",
        "grid-cols-2 auto-rows-[12rem] sm:auto-rows-[14rem]", // Mobile: 2 cols, smaller height
        "lg:grid-cols-3 lg:auto-rows-[22rem]", // Desktop: original layout
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  hideCta = false,
}: BentoCardProps) => (
  <div
    key={name}
      className={cn(
        "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-xl",
        // Clean card structure - no background overlay that interferes with gradient
        "border border-slate-700/30",
        // Hover effects that enhance rather than interfere
        "hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20",
        "transition-all duration-300 ease-out",
        // Mobile: handle special layout for first card and others
        name === "100% Automatic Bookings" ? "col-span-2 sm:col-span-2 lg:col-span-1" : "",
        // Override specific desktop grid positions on mobile
        "lg:col-span-1", // Reset for desktop
        className,
      )}
  >
    <div className="relative h-full">{background}</div>
    <div className={cn(
      "pointer-events-none z-10 flex flex-col",
      // All cards now use consistent absolute positioning - no more lg:static
      "absolute bottom-3 left-3 right-3 text-left gap-1 lg:bottom-6 lg:left-6 lg:right-6 lg:gap-2"
    )}>
      <Icon className={cn(
        "text-slate-200 group-hover:text-primary transition-colors duration-300",
        // Mobile: smaller icons
        "h-4 w-4 sm:h-5 sm:w-5 lg:h-8 lg:w-8"
      )} />
      <h3 className={cn(
        "font-semibold text-white group-hover:text-primary transition-colors duration-300",
        // Mobile: smaller text, desktop: original
        "text-xs sm:text-sm lg:text-xl lg:mb-2",
        name === "100% Automatic Bookings" ? "leading-tight" : ""
      )}>
        {name}
      </h3>
      <p className={cn(
        "text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors duration-300 font-garamond font-light",
        // Mobile: much smaller text and compact spacing
        "text-[10px] sm:text-xs lg:text-base lg:max-w-lg",
        "leading-tight sm:leading-snug lg:leading-relaxed",
        name === "100% Automatic Bookings" ? "" : ""
      )}>{description}</p>
    </div>

  </div>
);

export { BentoGrid, BentoCard };

