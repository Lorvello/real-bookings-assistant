
import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserIcon } from 'lucide-react';

interface AuthSectionProps {
  user: User | null;
  isMobile?: boolean;
}

export function AuthSection({ user, isMobile = false }: AuthSectionProps) {
  if (user) {
    return (
      <Link to="/dashboard">
        <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-green-400 transition-all">
          <AvatarFallback className="bg-green-600 text-white">
            <UserIcon className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </Link>
    );
  }

  return (
    <div className={`flex items-center ${isMobile ? 'flex-col gap-3 w-full' : 'gap-3'}`}>
      <Link to="/login">
        <button className={`border border-white/30 text-white rounded-lg font-medium hover:bg-white/10 transition-colors ${
          isMobile ? 'px-4 py-2 text-sm w-full' : 'px-5 py-2'
        }`}>
          Log In
        </button>
      </Link>
      <Link to="/signup">
        <button className={`bg-white text-emerald-600 rounded-lg font-medium hover:bg-white/90 transition-colors ${
          isMobile ? 'px-4 py-2 text-sm w-full' : 'px-5 py-2 shadow-lg'
        }`}>
          Get Started
        </button>
      </Link>
    </div>
  );
}
