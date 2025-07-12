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
            radial-gradient(ellipse 3000px 1500px at 50% -40%, rgba(5, 255, 200, 0.15) 0%, rgba(5, 255, 200, 0.08) 40%, rgba(5, 255, 200, 0.03) 60%, transparent 80%),
            radial-gradient(ellipse 2500px 1200px at 10% -20%, rgba(16, 255, 180, 1.0) 0%, rgba(16, 255, 180, 0.8) 15%, rgba(16, 255, 180, 0.5) 30%, rgba(16, 255, 180, 0.2) 50%, transparent 70%),
            radial-gradient(ellipse 2500px 1200px at 90% -20%, rgba(5, 255, 200, 1.0) 0%, rgba(5, 255, 200, 0.8) 15%, rgba(5, 255, 200, 0.5) 30%, rgba(5, 255, 200, 0.2) 50%, transparent 70%),
            radial-gradient(ellipse 2000px 800px at 50% -25%, rgba(20, 184, 166, 0.6) 0%, rgba(20, 184, 166, 0.3) 35%, rgba(20, 184, 166, 0.1) 55%, transparent 75%),
            radial-gradient(ellipse 1200px 600px at 30% -10%, rgba(34, 197, 94, 0.4) 0%, rgba(34, 197, 94, 0.15) 40%, transparent 65%)
          `,
          backgroundSize: '40px 40px, cover, cover, cover, cover, cover',
          backgroundRepeat: 'repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat'
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