import React from 'react';

interface BackgroundProviderProps {
  variant?: 'hero' | 'page' | 'dark';
  children: React.ReactNode;
  className?: string;
}

const BackgroundProvider: React.FC<BackgroundProviderProps> = ({ 
  variant = 'dark', 
  children,
  className = ""
}) => {
  const getBackgroundStyle = () => {
    switch (variant) {
      case 'hero':
        return {
          backgroundColor: 'hsl(217, 35%, 12%)',
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0),
            radial-gradient(ellipse 100% 80% at center 20%, 
              rgba(52, 211, 153, 0.8) 0%, 
              rgba(34, 197, 94, 0.5) 30%, 
              rgba(16, 185, 129, 0.2) 60%, 
              transparent 90%),
            radial-gradient(ellipse 80% 100% at 10% 10%, 
              rgba(52, 211, 153, 0.6) 0%, 
              rgba(34, 197, 94, 0.3) 40%, 
              transparent 80%),
            radial-gradient(ellipse 80% 100% at 90% 10%, 
              rgba(52, 211, 153, 0.6) 0%, 
              rgba(34, 197, 94, 0.3) 40%, 
              transparent 80%)
          `,
          backgroundSize: '40px 40px, cover, cover, cover',
          backgroundRepeat: 'repeat, no-repeat, no-repeat, no-repeat'
        };
      case 'dark':
        return {
          backgroundColor: 'hsl(217, 35%, 12%)'
        };
      default:
        return {
          backgroundColor: 'hsl(217, 35%, 12%)'
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