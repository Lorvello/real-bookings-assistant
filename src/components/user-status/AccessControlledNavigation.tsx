
import React, { useMemo } from 'react';
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
  Eye,
  Phone
} from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useToast } from '@/hooks/use-toast';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAccess?: keyof import('@/types/userStatus').AccessControl;
  description?: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar, requiresAccess: 'canCreateBookings', description: 'View and manage calendar' },
  { name: 'Bookings', href: '/bookings', icon: BookOpen, requiresAccess: 'canCreateBookings', description: 'View and manage bookings' },
  { name: 'Availability', href: '/availability', icon: Clock, description: 'Set your working hours' },
  { name: 'WhatsApp', href: '/conversations', icon: MessageCircle, description: 'WhatsApp conversations' },
  { name: 'Bookings Assistant', href: '/whatsapp-booking-assistant', icon: Phone, description: 'WhatsApp booking assistant setup' },
  { name: 'Test your AI agent', href: '/test-ai-agent', icon: Bot, requiresAccess: 'canUseAI', description: 'AI assistant features' },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface AccessControlledNavigationProps {
  isSidebarOpen: boolean;
  onNavigate: (href: string) => void;
}

export function AccessControlledNavigation({ isSidebarOpen, onNavigate }: AccessControlledNavigationProps) {
  const location = useLocation();
  const { userStatus, accessControl } = useUserStatus();
  const { toast } = useToast();

  // Memoize navigation items with ULTRA-STABLE state to prevent any flashing
  const navigationItems = useMemo(() => {
    // ULTIMATE FAILSAFE: Multiple checks for paid subscribers to prevent ANY glitches
    const isPaidSubscriber = userStatus.userType === 'subscriber' || 
                            userStatus.isSubscriber || 
                            (userStatus.statusMessage === 'Active Subscription') ||
                            (userStatus.statusColor === 'green' && userStatus.statusMessage.includes('Active'));
    
    // STABLE STATUS: Don't process navigation during unknown/loading states
    if (userStatus.userType === 'unknown' && userStatus.statusMessage === 'Loading...') {
      return navigation.map((item) => ({
        ...item,
        isActive: location.pathname === item.href,
        isRestricted: false // Prevent lock icons during loading
      }));
    }
    
    return navigation.map((item) => {
      const isActive = location.pathname === item.href;
      
      // WhatsApp tab is always accessible (no restrictions)
      if (item.href === '/conversations') {
        return {
          ...item,
          isActive,
          isRestricted: false
        };
      }
      
      // Booking Assistant tab is always clickable (no lock icon)
      if (item.href === '/whatsapp-booking-assistant') {
        return {
          ...item,
          isActive,
          isRestricted: false
        };
      }

      // Test AI Agent tab is always clickable (no lock icon)
      if (item.href === '/test-ai-agent') {
        return {
          ...item,
          isActive,
          isRestricted: false
        };
      }
      
      // Special handling for setup incomplete users - lock specific features
      if (userStatus.userType === 'setup_incomplete') {
        return {
          ...item,
          isActive,
          isRestricted: false // No restrictions for navigation items
        };
      }
      
      // ULTIMATE FAILSAFE: For paid subscribers, NEVER show restrictions under any circumstances
      const isRestricted = isPaidSubscriber 
        ? false 
        : (item.requiresAccess && !accessControl[item.requiresAccess]);

      return {
        ...item,
        isActive,
        isRestricted
      };
    });
  }, [location.pathname, userStatus.userType, userStatus.isSubscriber, userStatus.statusMessage, userStatus.statusColor, accessControl]);

  const handleItemClick = (item: NavItem) => {
    // ULTIMATE FAILSAFE: Multiple checks for paid subscribers to prevent ANY access restrictions
    const isPaidSubscriber = userStatus.userType === 'subscriber' || 
                            userStatus.isSubscriber || 
                            (userStatus.statusMessage === 'Active Subscription') ||
                            (userStatus.statusColor === 'green' && userStatus.statusMessage.includes('Active'));
    
    // Don't process clicks during loading/unknown states to prevent glitches
    if (userStatus.userType === 'unknown' && userStatus.statusMessage === 'Loading...') {
      return;
    }
    
    // WhatsApp tab is always accessible - no restrictions
    if (item.href === '/conversations') {
      onNavigate(item.href);
      return;
    }
    
    // Booking Assistant tab is always clickable - let the page handle upgrade display
    if (item.href === '/whatsapp-booking-assistant') {
      onNavigate(item.href);
      return;
    }
    
    // Test AI Agent tab is always clickable - no restrictions
    if (item.href === '/test-ai-agent') {
      onNavigate(item.href);
      return;
    }
    
    // Special handling for setup incomplete users
    if (userStatus.userType === 'setup_incomplete') {
      // Allow access to all navigation items
      onNavigate(item.href);
      return;
    }
    
    if (!isPaidSubscriber && item.requiresAccess && !accessControl[item.requiresAccess]) {
      let title = "Access Restricted";
      let description = "This feature requires an active subscription.";
      
      if (userStatus.isExpired) {
        title = "Subscription Expired";
        description = "This feature requires an active subscription.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
      onNavigate('/settings');
      return;
    }

    onNavigate(item.href);
  };

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigationItems.map((item) => (
        <button
          key={item.name}
          onClick={() => handleItemClick(item)}
          className={`
            group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200 w-full text-left hover:scale-105
            ${item.isActive 
              ? 'bg-green-600 text-white shadow-lg' 
              : item.isRestricted
                ? 'text-gray-500 hover:bg-gray-700 hover:text-gray-400 cursor-not-allowed'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }
          `}
          title={
            item.isRestricted 
              ? userStatus.isSetupIncomplete 
                ? `${item.name} - Setup required` 
                : `${item.name} - Upgrade required`
              : item.name
          }
        >
          <div className="relative">
            <item.icon
              className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                item.isActive 
                  ? 'text-white' 
                  : item.isRestricted 
                    ? 'text-gray-600' 
                    : 'text-gray-400 group-hover:text-white'
              }`}
            />
            {item.isRestricted && (
              <div className="absolute -top-1 -right-1">
                <Lock className="h-3 w-3 text-red-400" />
              </div>
            )}
          </div>
          <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
            {item.name}
          </span>
          {item.isRestricted && isSidebarOpen && (
            <div className="ml-auto">
              <Lock className="h-4 w-4 text-red-400" />
            </div>
          )}
        </button>
      ))}
    </nav>
  );
}
