
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Settings, Info } from 'lucide-react';

/**
 * 🔧 DEPRECATED OAUTH CONFIG COMPONENT
 * ===================================
 * 
 * This component is now deprecated as the system has been simplified 
 * to use Cal.com only. OAuth configuration is no longer needed.
 */

export const CalendarOAuthConfig: React.FC = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="opacity-50 cursor-not-allowed">
          <span className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-md">
            <Settings className="h-4 w-4 mr-2" />
            OAuth Settings (Deprecated)
          </span>
        </div>
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle>OAuth Configuration (Deprecated)</SheetTitle>
          <SheetDescription>
            This feature has been simplified and is no longer needed.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>System Simplified:</strong> The Affable Bot system now uses Cal.com exclusively 
              for calendar integration. OAuth configuration is no longer required as Cal.com handles 
              all authentication and calendar synchronization automatically.
              <br /><br />
              Use the main calendar integration flow to connect your Cal.com account instead.
            </AlertDescription>
          </Alert>
        </div>
      </SheetContent>
    </Sheet>
  );
};
