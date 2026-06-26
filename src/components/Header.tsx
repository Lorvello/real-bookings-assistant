import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
    { name: 'About', path: '/about' },
    { name: 'Pricing', path: '/#pricing' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Contact', path: '/contact' }
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
    setIsMobileMenuOpen(false);
    // Route to home (no-op if already there) then SMOOTH-scroll to the real
    // #pricing section. Previous version scrolled to scrollHeight (absolute
    // bottom) with behavior:'instant' after a fixed 300ms timer, which jumped,
    // could overshoot the section, and on a slow cross-route mount sometimes
    // fired before home rendered. We poll a few rAFs for #pricing to exist (the
    // home route mounts async) and scroll the element itself into view, so it
    // lands precisely on Pricing from ANY route. scrollIntoView walks up to the
    // [data-scroll-container] (the app's single scroll parent).
    navigate('/#pricing');
    let tries = 0;
    const scrollToPricing = () => {
      const pricing = document.getElementById('pricing');
      if (pricing) {
        pricing.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (tries++ < 60) {
        requestAnimationFrame(scrollToPricing);
      }
    };
    requestAnimationFrame(scrollToPricing);
  };

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  // Shared premium link styling (brand emerald accent, soft hover pill, visible
  // keyboard focus). Used identically on desktop + mobile so every nav item reads
  // the same. `size` only varies the vertical padding (desktop tighter, mobile tappable).
  const navLinkClass = (isActive: boolean, size: 'desktop' | 'mobile') =>
    `relative rounded-xl px-4 ${size === 'desktop' ? 'py-2 text-sm' : 'py-3 text-base'} font-medium ` +
    'transition-colors duration-200 outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-0 ' +
    (isActive
      ? 'text-emerald-400 bg-emerald-500/15 ring-1 ring-inset ring-emerald-400/20'
      : 'text-slate-200 hover:text-white hover:bg-white/[0.06]');

  const renderNavLinks = (size: 'desktop' | 'mobile') =>
    navItems.map((item) => {
      // Pricing is an in-page scroll anchor, not a destination route, so it never
      // claims the active-page indicator (avoids two highlighted items on home).
      const isActive = item.path === '/#pricing' ? false : location.pathname === item.path;

      return item.path === '/#pricing' ? (
        <a
          key={item.name}
          href={item.path}
          onClick={handlePricingClick}
          aria-current={isActive ? 'page' : undefined}
          className={`${navLinkClass(isActive, size)} cursor-pointer`}
        >
          {item.name}
        </a>
      ) : (
        <Link
          key={item.name}
          to={item.path}
          onClick={handleNavClick}
          aria-current={isActive ? 'page' : undefined}
          className={navLinkClass(isActive, size)}
        >
          {item.name}
        </Link>
      );
    });

  const ctaButtonClass =
    'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 ' +
    'text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 ' +
    'transition-all duration-300 hover:shadow-emerald-500/40 hover:brightness-110';

  return (
    <header
      className={`fixed top-0 left-0 right-0 w-full pt-4 px-4 sm:px-6 lg:px-8 z-50 transition-transform duration-300 ease-in-out ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {/* Mobile scrim: dims the page behind the open menu and dismisses on tap.
          Portaled to <body> because this <header> carries a live `transform`
          (translate-y for hide-on-scroll), which would otherwise make a
          position:fixed child resolve against the header box, not the viewport. */}
      {isMobileMenuOpen &&
        createPortal(
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />,
          document.body,
        )}
      <nav
        className="relative z-10 max-w-7xl mx-auto rounded-3xl px-6 sm:px-8 py-2.5 bg-slate-900/90 backdrop-blur-xl border border-white/10 ring-1 ring-white/5 shadow-xl shadow-black/30"
      >
        <div className="flex justify-between items-center">
          {/* Logo/Brand */}
          <Link
            to="/"
            onClick={handleNavClick}
            aria-label="Bookings Assistant home"
            className="flex items-center rounded-xl hover:opacity-80 transition-opacity select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            <img
              src="/lovable-uploads/81803cac-40e1-4777-b914-5ca4e2490468.png"
              alt="Bookings Assistant logo"
              className="h-9 sm:h-12 w-auto -my-2 pointer-events-none select-none"
              width="107"
              height="48"
              loading="eager"
              decoding="async"
            />
          </Link>

          {/* Desktop Navigation Links (flex-1 + center so the cluster sits
              balanced between the logo and the action buttons, no dead gap) */}
          <div className="hidden lg:flex lg:flex-1 items-center justify-center space-x-1">
            {renderNavLinks('desktop')}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Hairline divider separating navigation from account actions */}
            <span aria-hidden="true" className="h-5 w-px bg-white/10 mr-1" />
            {!user && (
              <Link to="/login">
                <Button
                  variant="ghost"
                  className="text-slate-200 hover:text-white hover:bg-white/[0.08] font-medium px-5 py-2.5"
                >
                  Log In
                </Button>
              </Link>
            )}
            <Button
              onClick={handleGetStarted}
              className={ctaButtonClass}
            >
              {user ? 'Dashboard' : 'Get Started'}
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 pb-2 border-t border-white/10 animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <div className="flex flex-col space-y-0.5">
              {renderNavLinks('mobile')}
            </div>
            {/* Account-action block, visually grouped + divided from the nav links */}
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
              {!user && (
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full">
                  <Button
                    variant="ghost"
                    className="text-slate-200 hover:text-white hover:bg-white/[0.08] font-medium w-full justify-start px-4"
                  >
                    Log In
                  </Button>
                </Link>
              )}
              <Button
                onClick={handleGetStarted}
                className={`${ctaButtonClass} w-full`}
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
