
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
        className="text-xl sm:text-2xl font-bold text-white hover:text-green-400 transition-colors"
      >
        Bookings Assistant
      </Link>
    </div>
  );
}
