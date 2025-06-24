
import React from 'react';
import { UserCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

interface UserProfileSectionProps {
  isSidebarOpen: boolean;
  onSignOut: () => void;
}

export function UserProfileSection({ isSidebarOpen, onSignOut }: UserProfileSectionProps) {
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <div className="border-t border-gray-700 p-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <UserCircle className="h-10 w-10 text-gray-400" />
        </div>
        {isSidebarOpen && (
          <div className="ml-3 min-w-0 flex-1 transition-all duration-300">
            <p className="text-sm font-medium text-white truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
        )}
      </div>
      <Button
        onClick={onSignOut}
        variant="ghost"
        className="mt-3 flex w-full items-center justify-start rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-all duration-200 hover:scale-105"
        title="Uitloggen"
      >
        <LogOut className="mr-2 h-5 w-5" />
        {isSidebarOpen && <span className="transition-all duration-300">Sign Out</span>}
      </Button>
    </div>
  );
}
