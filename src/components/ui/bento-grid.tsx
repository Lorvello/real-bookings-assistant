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
        "grid w-full auto-rows-[22rem] grid-cols-1 gap-4 lg:grid-cols-3",
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
        // Base styling with slate theme
        "bg-slate-800/80 border border-slate-700/50",
        // Subtle hover effects with glow only
        "hover:bg-slate-800/90 hover:border-emerald-500/30",
        "shadow-lg shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/30",
        "transition-all duration-300 ease-out",
        "backdrop-blur-sm",
        className,
      )}
  >
    <div>{background}</div>
    <div className={cn(
      "pointer-events-none z-10 flex flex-col gap-2",
      name === "100% Automatic Bookings" 
        ? "absolute bottom-6 left-6 right-6 text-left" 
        : "p-6"
    )}>
      <Icon className="h-12 w-12 text-emerald-400" />
      <h3 className={cn(
        "text-xl font-semibold text-white mb-2",
        name === "100% Automatic Bookings" ? "" : ""
      )}>
        {name}
      </h3>
      <p className={cn(
        "max-w-lg text-slate-300 leading-relaxed",
        name === "100% Automatic Bookings" ? "text-sm" : ""
      )}>{description}</p>
    </div>

  </div>
);

export { BentoGrid, BentoCard };