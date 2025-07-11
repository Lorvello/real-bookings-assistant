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
            radial-gradient(ellipse 80% 60% at center top, rgba(34, 197, 94, 0.6), transparent 70%),
            radial-gradient(ellipse 70% 50% at top left, rgba(16, 185, 129, 0.4), transparent 65%),
            radial-gradient(ellipse 70% 50% at top right, rgba(5, 150, 105, 0.4), transparent 65%),
            linear-gradient(180deg, 
              #22C55E 0%,
              #16A34A 12%,
              #059669 25%,
              #047857 40%,
              #065F46 55%,
              #064E3B 70%,
              #1F2937 85%,
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