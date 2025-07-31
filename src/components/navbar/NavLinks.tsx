
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const linkClasses = (path: string) => 
    `${isMobile ? 'block' : ''} px-3 py-3 sm:py-2 rounded-md ${isMobile ? 'text-base' : 'text-sm'} font-medium transition-colors min-h-[44px] flex items-center ${
      location.pathname === path
        ? 'text-green-400 bg-slate-700/50'
        : 'text-slate-300 hover:text-white hover:bg-slate-700/30'
    }`;

  const handleClick = (item: NavItem) => {
    if (item.path === '/#pricing') {
      navigate('/');
      setTimeout(() => {
        const pricingElement = document.getElementById('pricing');
        if (pricingElement) {
          pricingElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const appScrollContainer = document.querySelector('[data-scroll-container]');
      if (appScrollContainer) {
        appScrollContainer.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
    onNavClick();
  };

  return (
    <>
      {navItems.map((item) => (
        item.path === '/#pricing' ? (
          <button
            key={item.name}
            onClick={() => handleClick(item)}
            className={linkClasses('/')}
          >
            {item.name}
          </button>
        ) : (
          <Link
            key={item.name}
            to={item.path}
            onClick={onNavClick}
            className={linkClasses(item.path)}
          >
            {item.name}
          </Link>
        )
      ))}
    </>
  );
}
