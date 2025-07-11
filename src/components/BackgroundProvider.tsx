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
            radial-gradient(circle at center top, rgba(34, 197, 94, 0.9), transparent 25%),
            radial-gradient(circle at top left, rgba(16, 185, 129, 0.7), transparent 35%),
            radial-gradient(circle at top right, rgba(5, 150, 105, 0.7), transparent 35%),
            linear-gradient(180deg, 
              #22C55E 0%,
              #16A34A 8%,
              #059669 12%,
              #047857 16%,
              #064E3B 18%,
              #1F2937 20%,
              #111827 22%,
              #0F172A 25%,
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