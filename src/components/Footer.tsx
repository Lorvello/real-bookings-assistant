import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Mail, ArrowUpRight } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { name: 'Home', href: '/' },
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'Why Us', href: '/why-us' },
    { name: 'Pricing', href: '/#pricing' },
    { name: 'FAQ', href: '/faq' },
  ];

  const legalLinks = [
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Privacy Policy', href: '/privacy' },
  ];

  return (
    <footer className="relative bg-background-secondary border-t border-border/50">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-20">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg group-hover:bg-primary/30 transition-colors duration-300" />
                <div className="relative bg-gradient-to-br from-primary to-secondary p-2.5 rounded-xl">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">
                BookingsAssistant
              </span>
            </Link>
            
            <p className="mt-6 text-muted-foreground leading-relaxed max-w-md">
              AI-powered WhatsApp booking automation for modern businesses. 
              Let your customers book appointments 24/7 while you focus on what matters most.
            </p>

            {/* Contact */}
            <a 
              href="mailto:support@bookingsassistant.com"
              className="inline-flex items-center gap-2 mt-6 text-muted-foreground hover:text-primary transition-colors duration-200 group"
            >
              <Mail className="h-4 w-4" />
              <span>support@bookingsassistant.com</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </a>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">
              Product
            </h3>
            <ul className="space-y-4">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors duration-200 inline-flex items-center gap-1 group"
                  >
                    {link.name}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">
              Legal
            </h3>
            <ul className="space-y-4">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors duration-200 inline-flex items-center gap-1 group"
                  >
                    {link.name}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-border/30">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} BookingsAssistant. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground/60">
              Empowering businesses with AI-driven automation
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
