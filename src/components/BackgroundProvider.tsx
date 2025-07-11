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
          backgroundColor: '#0F172A',
          background: `
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0),
            radial-gradient(ellipse 60% 40% at center top, rgba(34, 197, 94, 0.8), transparent 70%),
            radial-gradient(ellipse 60% 70% at top left, rgba(16, 185, 129, 0.9), transparent 80%),
            radial-gradient(ellipse 60% 70% at top right, rgba(5, 150, 105, 0.9), transparent 80%)
          `,
          backgroundSize: '40px 40px, cover, cover, cover'
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