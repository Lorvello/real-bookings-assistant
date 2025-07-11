
import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from './navbar/Logo';
import { NavLinks } from './navbar/NavLinks';
import { AuthSection } from './navbar/AuthSection';
import { MobileMenu } from './navbar/MobileMenu';
import { useNavbarAuth } from './navbar/useNavbarAuth';

const Navbar = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useNavbarAuth();
  
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'How it Works', path: '/how-it-works' },
    { name: 'Why Us', path: '/why-us' },
    { name: 'Pricing', path: '/#pricing' },
    { name: 'FAQ', path: '/faq' }
  ];

  const handleNavClick = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-transparent shadow-lg border-b border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <Logo onNavClick={handleNavClick} />
          
          {/* Desktop Navigation Links */}
          <div className="hidden lg:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <NavLinks navItems={navItems} onNavClick={handleNavClick} />
            </div>
          </div>
          
          {/* Desktop CTA Button or Profile */}
          <div className="hidden lg:block">
            <AuthSection 
              user={user} 
              isDialogOpen={isDialogOpen} 
              setIsDialogOpen={setIsDialogOpen} 
            />
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-300 hover:text-white transition-colors p-2 -m-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
        </div>

        <MobileMenu 
          isOpen={isMobileMenuOpen} 
          navItems={navItems} 
          onNavClick={handleNavClick}
          user={user}
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
        />
      </div>
    </nav>
  );
};

export default Navbar;
