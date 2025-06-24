
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
  if (!isOpen) return null;

  return (
    <div className="lg:hidden">
      <div className="px-2 pt-2 pb-3 space-y-1 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700 mt-4 rounded-lg">
        <NavLinks navItems={navItems} onNavClick={onNavClick} isMobile />
      </div>
    </div>
  );
}
