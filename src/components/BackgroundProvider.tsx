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
            radial-gradient(ellipse 1400px 800px at 50% 0%, rgba(16, 185, 129, 0.7) 0%, rgba(16, 185, 129, 0.35) 40%, transparent 85%),
            radial-gradient(ellipse 1000px 600px at 0% 0%, rgba(16, 185, 129, 0.7) 0%, rgba(16, 185, 129, 0.25) 50%, transparent 85%),
            radial-gradient(ellipse 1000px 600px at 100% 0%, rgba(16, 185, 129, 0.7) 0%, rgba(16, 185, 129, 0.25) 50%, transparent 85%)
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