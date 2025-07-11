import React from 'react';

interface BackgroundProviderProps {
  variant?: 'hero' | 'page' | 'dark';
  children: React.ReactNode;
  className?: string;
}

const BackgroundProvider: React.FC<BackgroundProviderProps> = ({ 
  variant = 'page', 
  children,
  className = ""
}) => {
  const getBackgroundStyle = () => {
    switch (variant) {
      case 'hero':
        return {
          background: `
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0),
            radial-gradient(ellipse 50% 30% at center top, rgba(34, 197, 94, 0.9), transparent 35%),
            radial-gradient(ellipse 40% 25% at top left, rgba(16, 185, 129, 0.8), transparent 30%),
            radial-gradient(ellipse 40% 25% at top right, rgba(5, 150, 105, 0.8), transparent 30%),
            linear-gradient(180deg, 
              #22C55E 0%,
              #16A34A 8%,
              #059669 12%,
              #047857 15%,
              #0F172A 20%,
              #0F172A 100%
            )
          `,
          backgroundSize: '40px 40px, cover, cover, cover, cover'
        };
      case 'dark':
        return {
          backgroundColor: '#0F172A'
        };
      default:
        return {
          backgroundColor: '#1E293B'
        };
    }
  };

  return (
    <div 
      className={`min-h-screen ${className}`}
      style={getBackgroundStyle()}
    >
      {children}
    </div>
  );
};

export default BackgroundProvider;