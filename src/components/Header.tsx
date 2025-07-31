import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useScrollDirection } from '@/hooks/useScrollDirection';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isHeaderVisible } = useScrollDirection(10);
  
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'How it Works', path: '/how-it-works' },
    { name: 'Why Us', path: '/why-us' },
    { name: 'Pricing', path: '/#pricing' },
    { name: 'FAQ', path: '/faq' }
  ];

  const handleNavClick = () => {
    const appScrollContainer = document.querySelector('[data-scroll-container]');
    if (appScrollContainer) {
      appScrollContainer.scrollTo({ top: 0, behavior: 'instant' });
    }
    setIsMobileMenuOpen(false);
  };

  const handlePricingClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate('/');
    setTimeout(() => {
      const appScrollContainer = document.querySelector('[data-scroll-container]');
      const pricingElement = document.getElementById('pricing');
      
      if (appScrollContainer && pricingElement) {
        // Get the position of pricing element relative to scroll container
        const elementOffsetTop = pricingElement.offsetTop;
        appScrollContainer.scrollTo({ 
          top: elementOffsetTop - 100, // Small offset from top
          behavior: 'smooth' 
        });
      }
    }, 100);
    setIsMobileMenuOpen(false);
  };

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 w-full pt-4 px-4 sm:px-6 lg:px-8 z-50 transition-transform duration-300 ease-in-out ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <nav 
        className="max-w-7xl mx-auto mx-6 rounded-3xl px-8 py-2 shadow-lg"
        style={{ backgroundColor: '#0F172A' }}
      >
        <div className="flex justify-between items-center">
          {/* Logo/Brand */}
          <Link 
            to="/" 
            onClick={handleNavClick}
            className="flex items-center hover:opacity-80 transition-opacity select-none cursor-pointer"
          >
            <img 
              src="/lovable-uploads/81803cac-40e1-4777-b914-5ca4e2490468.png" 
              alt="Bookings Assistant logo" 
              className="h-10 sm:h-12 w-auto -my-2 pointer-events-none select-none"
            />
          </Link>
          
          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = item.path === '/#pricing' ? location.pathname === '/' : location.pathname === item.path;
              
              return item.path === '/#pricing' ? (
                <a
                  key={item.name}
                  href={item.path}
                  onClick={handlePricingClick}
                  className={`relative px-4 py-2 text-base transition-all duration-300 ease-out cursor-pointer outline-none ${
                    isActive 
                      ? 'text-emerald-500 font-semibold tracking-wide hover:text-emerald-500/80' 
                      : 'text-slate-300 font-normal hover:text-white'
                  }`}
                  style={isActive ? { 
                    textShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                    letterSpacing: '0.5px'
                  } : {}}
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={handleNavClick}
                  className={`relative px-4 py-2 text-base transition-all duration-300 ease-out outline-none ${
                    isActive 
                      ? 'text-emerald-500 font-semibold tracking-wide hover:text-emerald-500/80' 
                      : 'text-slate-300 font-normal hover:text-white'
                  }`}
                  style={isActive ? { 
                    textShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                    letterSpacing: '0.5px'
                  } : {}}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
          
          {/* Desktop CTA Button */}
          <div className="hidden lg:block">
            <Button 
              onClick={handleGetStarted}
              className="bg-green-500 hover:bg-green-400 text-white font-bold px-6 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              {user ? 'Dashboard' : 'Get Started'}
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-300 hover:text-white transition-colors p-2 -m-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pt-4 border-t border-slate-600">
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const isActive = item.path === '/#pricing' ? location.pathname === '/' : location.pathname === item.path;
                
                return item.path === '/#pricing' ? (
                  <a
                    key={item.name}
                    href={item.path}
                    onClick={handlePricingClick}
                    className={`relative px-4 py-3 text-base transition-all duration-300 ease-out cursor-pointer outline-none ${
                      isActive 
                        ? 'text-emerald-500 font-semibold tracking-wide hover:text-emerald-500/80' 
                        : 'text-slate-300 font-normal hover:text-white'
                    }`}
                    style={isActive ? { 
                      textShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                      letterSpacing: '0.5px'
                    } : {}}
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={handleNavClick}
                    className={`relative px-4 py-3 text-base transition-all duration-300 ease-out outline-none ${
                      isActive 
                        ? 'text-emerald-500 font-semibold tracking-wide hover:text-emerald-500/80' 
                        : 'text-slate-300 font-normal hover:text-white'
                    }`}
                    style={isActive ? { 
                      textShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                      letterSpacing: '0.5px'
                    } : {}}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <Button 
                onClick={handleGetStarted}
                className="bg-green-500 hover:bg-green-400 text-white font-bold px-6 py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl mt-4 w-full"
              >
                {user ? 'Dashboard' : 'Get Started'}
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
