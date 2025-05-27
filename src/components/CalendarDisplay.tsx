
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

// Re-implemented locally for isolation
const mockupVariants = cva(
  "flex relative z-10 overflow-hidden shadow-2xl border border-border/5 border-t-border/15",
  {
    variants: {
      type: {
        mobile: "rounded-[48px] max-w-[350px]",
        responsive: "rounded-md",
      },
    },
    defaultVariants: {
      type: "responsive",
    },
  }
)

interface MockupProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof mockupVariants> {}
const Mockup = React.forwardRef<HTMLDivElement, MockupProps>(
  ({ className, type, ...props }, ref) => (
    <div ref={ref} className={cn(mockupVariants({ type, className }))} {...props} />
  )
)
Mockup.displayName = "Mockup"

const frameVariants = cva("bg-accent/5 flex relative z-10 overflow-hidden rounded-2xl", {
  variants: {
    size: {
      small: "p-2",
      large: "p-4",
    },
  },
  defaultVariants: {
    size: "small",
  },
})
interface MockupFrameProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof frameVariants> {}
const MockupFrame = React.forwardRef<HTMLDivElement, MockupFrameProps>(
  ({ className, size, ...props }, ref) => (
    <div ref={ref} className={cn(frameVariants({ size, className }))} {...props} />
  )
)
MockupFrame.displayName = "MockupFrame"

// Calendar-only component
interface CalendarDisplayProps {
  src: string
  alt: string
  width: number
  height: number
}

const CalendarDisplay: React.FC<CalendarDisplayProps> = ({
  src,
  alt,
  width,
  height,
}) => {
  return (
    <div className="flex flex-col items-center bg-[#f3f1ea] w-full pb-20">
      <div className="mt-8 w-full relative animate-appear opacity-0 delay-700 max-w-6xl mx-auto px-4">
        <MockupFrame>
          <Mockup type="responsive">
            <img
              src={src}
              alt={alt}
              width={width}
              height={height}
              className="w-full"
            />
          </Mockup>
        </MockupFrame>
        <div
          className="absolute bottom-0 left-0 right-0 w-full h-[303px]"
          style={{
            background:
              "linear-gradient(to top, #DCD5C1 0%, rgba(217, 217, 217, 0) 100%)",
            zIndex: 10,
          }}
        />
      </div>
    </div>
  )
}

export default CalendarDisplay
