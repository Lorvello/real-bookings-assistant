import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calendar,
  Home,
  Settings,
  MessageCircle,
  Clock,
  BookOpen,
  Bot,
  Lock,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useToast } from '@/hooks/use-toast';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAccess?: keyof import('@/types/userStatus').AccessControl;
  description?: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, requiresAccess: 'canViewDashboard' },
  { name: 'Calendar', href: '/calendar', icon: Calendar, requiresAccess: 'canViewDashboard' },
  { name: 'Bookings', href: '/bookings', icon: BookOpen, requiresAccess: 'canViewDashboard', description: 'View and manage bookings' },
  { name: 'Availability', href: '/availability', icon: Clock, requiresAccess: 'canManageSettings', description: 'Set your working hours' },
  { name: 'WhatsApp', href: '/conversations', icon: MessageCircle, requiresAccess: 'canAccessWhatsApp', description: 'WhatsApp integration' },
  { name: 'Test your AI agent', href: '/test-ai-agent', icon: Bot, requiresAccess: 'canUseAI', description: 'AI assistant features' },
  { name: 'Settings', href: '/settings', icon: Settings, requiresAccess: 'canManageSettings' },
];

interface AccessControlledNavigationProps {
  isSidebarOpen: boolean;
  onNavigate: (href: string) => void;
}

export function AccessControlledNavigation({ isSidebarOpen, onNavigate }: AccessControlledNavigationProps) {
  const location = useLocation();
  const { userStatus, accessControl } = useUserStatus();
  const { toast } = useToast();

  const handleItemClick = (item: NavItem) => {
    // Check if user has access to this feature
    if (item.requiresAccess && !accessControl[item.requiresAccess]) {
      toast({
        title: "Access Restricted",
        description: `${item.description || item.name} requires an active subscription.`,
        variant: "destructive",
      });
      return;
    }

    // For expired users, show upgrade prompt for restricted features
    if (userStatus.isExpired && item.requiresAccess && item.requiresAccess !== 'canViewDashboard') {
      toast({
        title: "Upgrade Required",
        description: `Access to ${item.name} is limited. Please upgrade to continue.`,
        variant: "destructive",
      });
      onNavigate('/settings'); // Redirect to settings/billing
      return;
    }

    onNavigate(item.href);
  };

  const getItemState = (item: NavItem) => {
    const hasAccess = !item.requiresAccess || accessControl[item.requiresAccess];
    const isActive = location.pathname === item.href;
    const isRestricted = !hasAccess || (userStatus.isExpired && item.requiresAccess !== 'canViewDashboard');

    return { hasAccess, isActive, isRestricted };
  };

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigation.map((item) => {
        const { hasAccess, isActive, isRestricted } = getItemState(item);
        
        return (
          <button
            key={item.name}
            onClick={() => handleItemClick(item)}
            className={`
              group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200 w-full text-left hover:scale-105
              ${isActive 
                ? 'bg-green-600 text-white shadow-lg' 
                : isRestricted
                  ? 'text-gray-500 hover:bg-gray-700 hover:text-gray-400 cursor-not-allowed'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }
            `}
            title={
              isRestricted 
                ? `${item.name} - Upgrade required` 
                : item.name
            }
          >
            <div className="relative">
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                  isActive 
                    ? 'text-white' 
                    : isRestricted 
                      ? 'text-gray-600' 
                      : 'text-gray-400 group-hover:text-white'
                }`}
              />
              {isRestricted && (
                <div className="absolute -top-1 -right-1">
                  {userStatus.isExpired ? (
                    <Lock className="h-3 w-3 text-red-400" />
                  ) : (
                    <Eye className="h-3 w-3 text-yellow-400" />
                  )}
                </div>
              )}
            </div>
            <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
              {item.name}
            </span>
            {isRestricted && isSidebarOpen && (
              <div className="ml-auto">
                {userStatus.isExpired ? (
                  <Lock className="h-4 w-4 text-red-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                )}
              </div>
            )}
          </button>
        );
      })}
    </nav>
  );
}