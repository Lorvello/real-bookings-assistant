import React from 'react';

interface BackgroundProviderProps {
  variant?: 'hero' | 'page' | 'dark' | 'futuristic';
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
            radial-gradient(ellipse 2000px 1200px at 50% -30%, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 60%, transparent 70%),
            radial-gradient(ellipse 1400px 900px at 12% -15%, rgba(5, 255, 200, 1.0) 0%, rgba(5, 255, 200, 0.6) 20%, rgba(5, 255, 200, 0.3) 35%, rgba(5, 255, 200, 0.1) 50%, transparent 65%),
            radial-gradient(ellipse 1200px 800px at 88% -8%, rgba(20, 184, 166, 0.95) 0%, rgba(20, 184, 166, 0.5) 25%, rgba(20, 184, 166, 0.25) 40%, rgba(20, 184, 166, 0.08) 55%, transparent 70%),
            radial-gradient(ellipse 600px 400px at 30% 5%, rgba(52, 211, 153, 0.7) 0%, rgba(52, 211, 153, 0.3) 30%, rgba(52, 211, 153, 0.1) 50%, transparent 65%),
            radial-gradient(ellipse 800px 500px at 70% 8%, rgba(34, 197, 94, 0.6) 0%, rgba(34, 197, 94, 0.25) 35%, rgba(34, 197, 94, 0.08) 55%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 50% -5%, rgba(125, 211, 252, 0.5) 0%, rgba(125, 211, 252, 0.2) 40%, rgba(125, 211, 252, 0.05) 60%, transparent 75%),
            radial-gradient(ellipse 300px 200px at 25% -8%, rgba(16, 255, 180, 1.0) 0%, rgba(16, 255, 180, 0.8) 15%, rgba(16, 255, 180, 0.4) 35%, rgba(16, 255, 180, 0.1) 50%, transparent 65%),
            radial-gradient(ellipse 250px 180px at 75% -3%, rgba(6, 182, 212, 0.9) 0%, rgba(6, 182, 212, 0.6) 20%, rgba(6, 182, 212, 0.3) 40%, rgba(6, 182, 212, 0.08) 60%, transparent 75%),
            radial-gradient(ellipse 500px 350px at 15% -12%, rgba(16, 255, 180, 0.3) 0%, rgba(16, 255, 180, 0.1) 40%, transparent 60%),
            radial-gradient(ellipse 450px 300px at 85% -6%, rgba(20, 184, 166, 0.25) 0%, rgba(20, 184, 166, 0.08) 45%, transparent 65%)
          `,
          backgroundSize: '40px 40px, cover, cover, cover, cover, cover, cover, cover, cover, cover, cover',
          backgroundRepeat: 'repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat'
        };
      case 'futuristic':
        return {
          backgroundColor: 'hsl(217, 35%, 12%)',
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)),
            url('/assets/hero-futuristic-bg.png')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat'
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