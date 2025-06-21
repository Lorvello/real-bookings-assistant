
import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export function UserContextDisplay() {
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-muted/50 rounded-lg border">
      <User className="h-4 w-4 text-muted-foreground" />
      <div className="text-sm">
        <div className="font-medium text-foreground">
          {profile?.business_name || profile?.full_name || user?.email}
        </div>
        {profile?.business_name && (
          <div className="text-xs text-muted-foreground">
            {profile?.full_name}
          </div>
        )}
      </div>
    </div>
  );
}
