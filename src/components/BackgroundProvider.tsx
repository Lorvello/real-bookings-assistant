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
            radial-gradient(ellipse 120% 80% at 50% 10%, 
              rgba(52, 211, 153, 0.8) 0%, 
              rgba(34, 197, 94, 0.4) 30%, 
              transparent 60%),
            radial-gradient(ellipse 100% 100% at 5% 5%, 
              rgba(52, 211, 153, 0.5) 0%, 
              rgba(34, 197, 94, 0.2) 30%, 
              transparent 60%),
            radial-gradient(ellipse 100% 100% at 95% 5%, 
              rgba(52, 211, 153, 0.5) 0%, 
              rgba(34, 197, 94, 0.2) 30%, 
              transparent 60%)
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