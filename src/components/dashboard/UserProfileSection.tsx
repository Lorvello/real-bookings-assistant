
import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('app');

  return (
    <div className="border-t border-white/[0.08] p-4">
        {isSidebarOpen ? (
          <>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCircle className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="ml-3 min-w-0 flex-1 transition-all duration-300">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || t('app.userFallback', 'User')}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              onClick={onSignOut}
              variant="ghost"
              className="mt-3 flex w-full items-center justify-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-all duration-200 hover:scale-105"
              title={t('app.signOut', 'Sign Out')}
            >
              <LogOut className="mr-2 h-5 w-5" />
              <span className="transition-all duration-300">{t('app.signOut', 'Sign Out')}</span>
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            {/* Profile icon without tooltip when collapsed */}
            <div className="w-12 h-12 flex items-center justify-center rounded-lg">
              <UserCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            
            <Button
              onClick={onSignOut}
              variant="ghost"
              className="w-12 h-12 flex items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-all duration-200 hover:scale-105 p-0"
              title={t('app.signOut', 'Sign Out')}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        )}
    </div>
  );
}
