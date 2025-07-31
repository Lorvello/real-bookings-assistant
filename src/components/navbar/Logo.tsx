
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
          src="/lovable-uploads/0686ab4d-5774-407a-883a-2200f5de8ae5.png" 
          alt="Bookings Assistant logo" 
          className="h-8 sm:h-10 md:h-12 w-auto"
        />
      </Link>
    </div>
  );
}
