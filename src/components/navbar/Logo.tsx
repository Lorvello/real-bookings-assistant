
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
          src="/lovable-uploads/81803cac-40e1-4777-b914-5ca4e2490468.png" 
          alt="Bookings Assistant logo" 
          className="h-8 sm:h-10 md:h-12 w-auto"
          width="107"
          height="48"
          loading="eager"
          decoding="async"
        />
      </Link>
    </div>
  );
}
