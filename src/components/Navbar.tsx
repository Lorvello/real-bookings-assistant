
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
    <nav className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-xl font-bold text-white hover:text-emerald-400 transition-colors">
              Bookings Assistant
            </Link>
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-8 flex items-baseline space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'text-emerald-400 bg-gray-800'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
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
                <Avatar className="h-7 w-7 cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all">
                  <AvatarFallback className="bg-emerald-500 text-white">
                    <UserIcon className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button className="bg-emerald-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors shadow-lg text-sm">
                    Get Started
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-center text-xl font-bold text-white">
                      Get Started
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-3 pt-3">
                    <Link to="/login" onClick={() => setIsDialogOpen(false)}>
                      <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 text-sm">
                        Log In
                      </Button>
                    </Link>
                    <Link to="/signup" onClick={() => setIsDialogOpen(false)}>
                      <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-sm">
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
