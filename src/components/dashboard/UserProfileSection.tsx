
import React from 'react';
import { UserCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

interface UserProfileSectionProps {
  isSidebarOpen: boolean;
  onSignOut: () => void;
  tooltipsDisabled?: boolean;
}

export function UserProfileSection({ isSidebarOpen, onSignOut, tooltipsDisabled = false }: UserProfileSectionProps) {
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <div className="border-t border-gray-700 p-4">
        {isSidebarOpen ? (
          <>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCircle className="h-10 w-10 text-gray-400" />
              </div>
              <div className="ml-3 min-w-0 flex-1 transition-all duration-300">
                <p className="text-sm font-medium text-white truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              onClick={onSignOut}
              variant="ghost"
              className="mt-3 flex w-full items-center justify-start rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-all duration-200 hover:scale-105"
              title="Uitloggen"
            >
              <LogOut className="mr-2 h-5 w-5" />
              <span className="transition-all duration-300">Sign Out</span>
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            {/* Profile icon without tooltip when collapsed */}
            <div className="w-12 h-12 flex items-center justify-center rounded-lg">
              <UserCircle className="h-6 w-6 text-gray-400" />
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onSignOut}
                  variant="ghost"
                  className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-all duration-200 hover:scale-105 p-0"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              {!tooltipsDisabled && (
                <TooltipContent className="bg-popover border text-popover-foreground">
                  <p className="text-sm">Sign Out</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        )}
    </div>
  );
}
