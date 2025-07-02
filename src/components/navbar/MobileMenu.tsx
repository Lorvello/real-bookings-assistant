
import React from 'react';
import { NavLinks } from './NavLinks';

interface NavItem {
  name: string;
  path: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  navItems: NavItem[];
  onNavClick: () => void;
}

export function MobileMenu({ isOpen, navItems, onNavClick }: MobileMenuProps) {
  return (
    <div 
      className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ease-in-out ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}
    >
      {/* Overlay */}
      <div 
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onNavClick}
      />
      
      {/* Sliding Menu */}
      <div 
        className={`absolute top-0 right-0 h-full w-80 max-w-[80vw] bg-slate-900/95 backdrop-blur-md border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 space-y-4">
          <div className="text-xl font-bold text-white mb-8 text-center">Navigation</div>
          <div className="space-y-2">
            <NavLinks navItems={navItems} onNavClick={onNavClick} isMobile />
          </div>
        </div>
      </div>
    </div>
  );
}
