
import React, { useEffect } from 'react';

interface DashboardBackgroundProps {
  children: React.ReactNode;
}

export function DashboardBackground({ children }: DashboardBackgroundProps) {
  useEffect(() => {
    // Create keyframes using safer CSS-in-JS approach instead of dangerouslySetInnerHTML
    const styleId = 'dashboard-float-animation';
    let existingStyle = document.getElementById(styleId);
    
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          25% {
            transform: translateY(-20px) rotate(2deg) scale(1.02);
          }
          50% {
            transform: translateY(-10px) rotate(-1deg) scale(0.98);
          }
          75% {
            transform: translateY(-15px) rotate(1deg) scale(1.01);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Cleanup function
    return () => {
      const style = document.getElementById(styleId);
      if (style) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return <>{children}</>;
}
