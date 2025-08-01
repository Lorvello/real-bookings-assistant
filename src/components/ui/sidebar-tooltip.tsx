import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface SidebarTooltipProps {
  children: React.ReactNode;
  content: string;
  disabled?: boolean;
  side?: 'right' | 'left';
  sideOffset?: number;
}

export function SidebarTooltip({ 
  children, 
  content, 
  disabled = false, 
  side = 'right',
  sideOffset = 12 
}: SidebarTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let x: number;
    let y: number;

    if (side === 'right') {
      x = triggerRect.right + sideOffset;
    } else {
      x = triggerRect.left - tooltipRect.width - sideOffset;
    }

    // Center vertically relative to trigger
    y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);

    // Viewport bounds checking
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Adjust if tooltip goes below viewport
    if (y + tooltipRect.height > viewportHeight) {
      y = viewportHeight - tooltipRect.height - 8;
    }
    
    // Adjust if tooltip goes above viewport
    if (y < 8) {
      y = 8;
    }

    // Adjust if tooltip goes beyond right edge
    if (x + tooltipRect.width > viewportWidth) {
      x = viewportWidth - tooltipRect.width - 8;
    }

    // Adjust if tooltip goes beyond left edge
    if (x < 8) {
      x = 8;
    }

    setPosition({ x, y });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isVisible]);

  const handleMouseEnter = () => {
    if (!disabled) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const tooltip = isVisible && !disabled ? createPortal(
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-[9999] px-3 py-1.5 text-sm rounded-md shadow-lg",
        "bg-gray-900 text-white border border-gray-700",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        "pointer-events-none select-none"
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {content}
      <div
        className={cn(
          "absolute w-2 h-2 bg-gray-900 border-gray-700 rotate-45",
          side === 'right' 
            ? "left-[-4px] top-1/2 -translate-y-1/2 border-l border-b"
            : "right-[-4px] top-1/2 -translate-y-1/2 border-r border-t"
        )}
      />
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {tooltip}
    </>
  );
}