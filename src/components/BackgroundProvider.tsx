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
            radial-gradient(ellipse 1200px 800px at 15% -10%, rgba(16, 185, 129, 0.9) 0%, rgba(16, 185, 129, 0.2) 25%, rgba(16, 185, 129, 0.05) 40%, transparent 50%),
            radial-gradient(ellipse 1000px 700px at 85% -5%, rgba(5, 211, 145, 0.8) 0%, rgba(5, 211, 145, 0.15) 30%, rgba(5, 211, 145, 0.03) 45%, transparent 55%),
            radial-gradient(ellipse 800px 500px at 50% -20%, rgba(34, 197, 94, 0.6) 0%, rgba(34, 197, 94, 0.1) 35%, transparent 45%)
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