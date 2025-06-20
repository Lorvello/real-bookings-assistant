
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserIcon } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'How it Works', path: '/how-it-works' },
    { name: 'Why Us', path: '/why-us' },
    { name: 'Pricing', path: '/#pricing' },
    { name: 'FAQ', path: '/faq' }
  ];

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
              Bookings Assistant
            </Link>
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'text-primary bg-muted'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          
          {/* CTA Button or Profile */}
          <div className="hidden md:block">
            {user ? (
              <Link to="/profile">
                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg">
                    Get Started
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-bold text-card-foreground">
                      Get Started
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 pt-4">
                    <Link to="/login" onClick={() => setIsDialogOpen(false)}>
                      <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted">
                        Log In
                      </Button>
                    </Link>
                    <Link to="/signup" onClick={() => setIsDialogOpen(false)}>
                      <Button className="w-full bg-primary hover:bg-primary/90">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
