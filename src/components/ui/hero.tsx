
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Mockup, MockupFrame } from "@/components/ui/mockup"

interface HeroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  subtitle?: string
  eyebrow?: string
  ctaText?: string
  ctaLink?: string
  mockupImage?: {
    src: string
    alt: string
    width: number
    height: number
  }
}

const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  ({ className, title, subtitle, eyebrow, ctaText, ctaLink, mockupImage, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center", className)}
        style={{
          background: `
            radial-gradient(circle at center top, rgba(34, 197, 94, 0.8), transparent 30%),
            radial-gradient(circle at top left, rgba(16, 185, 129, 0.6), transparent 40%),
            radial-gradient(circle at top right, rgba(5, 150, 105, 0.6), transparent 40%),
            linear-gradient(180deg, 
              #22C55E 0%,
              #16A34A 5%,
              #059669 10%,
              #047857 15%,
              #0F766E 20%,
              #1E40AF 25%,
              #1E293B 30%,
              #0F172A 35%,
              #0F172A 100%
            )
          `
        }}
        {...props}
      >
        {eyebrow && (
          <p 
            className="font-instrument-sans uppercase tracking-[0.51em] leading-[133%] text-center text-[19px] mt-[180px] mb-6 text-[#000000] animate-appear opacity-0"
          >
            {eyebrow}
          </p>
        )}

        <h1 
          className="text-[76px] leading-[92px] text-center px-4 lg:px-[240px] text-[#000000] animate-appear opacity-0 delay-100"
        >
          {title}
        </h1>

        {subtitle && (
          <p 
            className="text-[32px] text-center font-instrument-sans font-light px-4 lg:px-[240px] mt-[18px] mb-[32px] leading-[133%] text-[#000000] animate-appear opacity-0 delay-300"
          >
            {subtitle}
          </p>
        )}

        {ctaText && ctaLink && (
          <a href={ctaLink}>
            <div 
              className="inline-flex items-center bg-[#000000] text-[#ffffff] rounded-[10px] hover:bg-[#000000]/90 transition-colors font-instrument-sans w-[272px] h-[58px] animate-appear opacity-0 delay-500"
            >
              <div className="flex items-center justify-between w-full pl-[26px] pr-[20px]">
                <span className="text-[22px] whitespace-nowrap">{ctaText}</span>
                <div className="flex items-center gap-[14px]">
                  <div className="w-[43px] h-[18px] relative">
                    <img
                      src="https://res.cloudinary.com/ducqjmtlk/image/upload/v1737918196/Arrow_1_tacbar.svg"
                      alt="Arrow"
                      width={43}
                      height={18}
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </a>
        )}

        {mockupImage && (
          <div className="mt-16 w-full relative animate-appear opacity-0 delay-700">
            <MockupFrame>
              <Mockup type="responsive">
                <img
                  src={mockupImage.src}
                  alt={mockupImage.alt}
                  width={mockupImage.width}
                  height={mockupImage.height}
                  className="w-full"
                />
              </Mockup>
            </MockupFrame>
            <div
              className="absolute bottom-0 left-0 right-0 w-full h-[303px]"
              style={{
                background: "linear-gradient(to top, #DCD5C1 0%, rgba(217, 217, 217, 0) 100%)",
                zIndex: 10,
              }}
            />
          </div>
        )}
      </div>
    )
  }
)
Hero.displayName = "Hero"

export { Hero }
