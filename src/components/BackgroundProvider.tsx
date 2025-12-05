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
        // Dark base background for the bioluminescent effects
        return {
          backgroundColor: 'hsl(210, 50%, 5%)'
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
