
import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  onNavClick: () => void;
}

export function Logo({ onNavClick }: LogoProps) {
  return (
    <div className="flex-shrink-0">
      <Link 
        to="/" 
        onClick={onNavClick} 
        className="flex items-center hover:opacity-80 transition-opacity"
      >
        <img 
          src="/lovable-uploads/5d77b9f5-4f42-48e1-b293-ac3521cdeaba.png" 
          alt="Bookings Assistant logo" 
          className="h-8 sm:h-10 md:h-12 w-auto"
        />
      </Link>
    </div>
  );
}
