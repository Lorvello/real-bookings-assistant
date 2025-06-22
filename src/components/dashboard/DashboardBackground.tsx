
import React from 'react';

interface DashboardBackgroundProps {
  children: React.ReactNode;
}

export function DashboardBackground({ children }: DashboardBackgroundProps) {
  // Define keyframes for animations using CSS-in-JS
  const floatKeyframes = `
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: floatKeyframes }} />
      {children}
    </>
  );
}
