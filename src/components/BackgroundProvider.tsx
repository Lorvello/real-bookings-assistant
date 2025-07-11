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
          backgroundColor: '#0B1426',
          background: `
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0),
            radial-gradient(ellipse 80% 60% at center top, rgba(34, 197, 94, 0.8), transparent 90%),
            radial-gradient(ellipse 75% 85% at top left, rgba(34, 197, 94, 0.9), transparent 90%),
            radial-gradient(ellipse 75% 85% at top right, rgba(34, 197, 94, 0.9), transparent 90%),
            radial-gradient(ellipse 70% 80% at 25% 20%, rgba(34, 197, 94, 0.6), transparent 95%),
            radial-gradient(ellipse 70% 80% at 75% 20%, rgba(34, 197, 94, 0.6), transparent 95%)
          `,
          backgroundSize: '40px 40px, cover, cover, cover, cover, cover'
        };
      case 'dark':
        return {
          backgroundColor: '#0B1426'
        };
      default:
        return {
          backgroundColor: '#0B1426'
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