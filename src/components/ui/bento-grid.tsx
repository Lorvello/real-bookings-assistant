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
        // Uniform flat background - no default glow
        "bg-background/90 border border-muted/30",
        // Card hover effects only - unified green glow
        "hover:bg-background/95 hover:border-primary/50",
        "shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-primary/40",
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
      <Icon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
      <h3 className={cn(
        "text-xl font-semibold text-foreground group-hover:text-primary mb-2 transition-colors duration-300",
        name === "100% Automatic Bookings" ? "" : ""
      )}>
        {name}
      </h3>
      <p className={cn(
        "max-w-lg text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300",
        name === "100% Automatic Bookings" ? "text-sm" : ""
      )}>{description}</p>
    </div>

  </div>
);

export { BentoGrid, BentoCard };