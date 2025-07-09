import { ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
  rowHeight?: string;
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

const BentoGrid = ({ children, className, rowHeight = "22rem" }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-4 lg:grid-cols-3",
        className,
      )}
      style={{ gridAutoRows: rowHeight }}
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
      // Enhanced hover effects with glow
      "hover:bg-slate-800/90 hover:border-emerald-500/30 hover:scale-[1.02]",
      "shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:shadow-emerald-500/20",
      "transition-all duration-300 ease-out transform-gpu",
      "backdrop-blur-sm",
      className,
    )}
  >
    <div>{background}</div>
    <div className={cn(
      "pointer-events-none z-10 flex transform-gpu flex-col gap-2 transition-all duration-300",
      name === "100% Automatic Bookings" 
        ? "absolute bottom-6 left-6 right-6 text-left" 
        : "p-6 group-hover:-translate-y-2"
    )}>
      <Icon className="h-12 w-12 origin-left transform-gpu text-emerald-400 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-emerald-300" />
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

    {!hideCta && (
      <div
        className={cn(
          "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
        )}
      >
        <Button 
          variant="ghost" 
          asChild 
          size="sm" 
          className="pointer-events-auto text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
        >
          <a href={href}>
            {cta}
            <ArrowRightIcon className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    )}
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-emerald-500/5 group-hover:to-emerald-600/10" />
  </div>
);

export { BentoGrid, BentoCard };