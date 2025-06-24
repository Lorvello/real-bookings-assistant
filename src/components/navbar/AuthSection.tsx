
import React from 'react';
import { Link } from 'react-router-dom';
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

interface AuthSectionProps {
  user: User | null;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  isMobile?: boolean;
}

export function AuthSection({ user, isDialogOpen, setIsDialogOpen, isMobile = false }: AuthSectionProps) {
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
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <button className={`bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors ${
          isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-2 shadow-lg'
        }`}>
          Get Started
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-gray-900">
            Get Started
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-4">
          <Link to="/login" onClick={() => setIsDialogOpen(false)}>
            <Button variant="outline" className="w-full">
              Log In
            </Button>
          </Link>
          <Link to="/signup" onClick={() => setIsDialogOpen(false)}>
            <Button className="w-full bg-green-600 hover:bg-green-700">
              Sign Up
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
