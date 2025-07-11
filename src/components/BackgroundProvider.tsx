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