
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  name: string;
  path: string;
}

interface NavLinksProps {
  navItems: NavItem[];
  onNavClick: () => void;
  isMobile?: boolean;
}

export function NavLinks({ navItems, onNavClick, isMobile = false }: NavLinksProps) {
  const location = useLocation();

  const linkClasses = (path: string) => 
    `${isMobile ? 'block' : ''} px-3 py-2 rounded-md ${isMobile ? 'text-base' : 'text-sm'} font-medium transition-colors ${
      location.pathname === path
        ? 'text-green-400 bg-slate-700/50'
        : 'text-slate-300 hover:text-white hover:bg-slate-700/30'
    }`;

  return (
    <>
      {navItems.map((item) => (
        <Link
          key={item.name}
          to={item.path}
          onClick={onNavClick}
          className={linkClasses(item.path)}
        >
          {item.name}
        </Link>
      ))}
    </>
  );
}
