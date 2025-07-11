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
          background: `
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0),
            radial-gradient(ellipse 80% 60% at center top, 
              rgba(52, 211, 153, 1) 0%,           
              rgba(34, 197, 94, 0.8) 25%,         
              rgba(16, 185, 129, 0.4) 50%,        
              hsl(217, 35%, 12%) 80%),            
            radial-gradient(ellipse 70% 80% at top left,
              rgba(52, 211, 153, 0.9) 0%,         
              rgba(34, 197, 94, 0.6) 30%,         
              rgba(16, 185, 129, 0.3) 60%,        
              hsl(217, 35%, 12%) 85%),            
            radial-gradient(ellipse 70% 80% at top right,
              rgba(52, 211, 153, 0.9) 0%,         
              rgba(34, 197, 94, 0.6) 30%,         
              rgba(16, 185, 129, 0.3) 60%,        
              hsl(217, 35%, 12%) 85%)             
          `,
          backgroundSize: '40px 40px, cover, cover, cover'
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