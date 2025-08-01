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
import { SidebarTooltip } from '@/components/ui/sidebar-tooltip';

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
  onMobileNavigate?: () => void;
  tooltipsDisabled?: boolean;
}

export function AccessControlledNavigation({ isSidebarOpen, onNavigate, onMobileNavigate, tooltipsDisabled = false }: AccessControlledNavigationProps) {
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
      
      // Booking Assistant tab: Lock during setup incomplete
      if (item.href === '/whatsapp-booking-assistant') {
        return {
          ...item,
          isActive,
          isRestricted: userStatus.isSetupIncomplete
        };
      }

      // Test AI Agent tab: Lock during setup incomplete, expired trial, or canceled and inactive
      if (item.href === '/test-ai-agent') {
        return {
          ...item,
          isActive,
          isRestricted: userStatus.isSetupIncomplete || 
                       userStatus.userType === 'expired_trial' ||
                       userStatus.userType === 'canceled_and_inactive'
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
      onMobileNavigate?.();
      return;
    }
    
    // Booking Assistant tab: Show setup message if incomplete
    if (item.href === '/whatsapp-booking-assistant') {
      if (userStatus.isSetupIncomplete) {
        toast({
          title: "Setup Required",
          description: "Complete your account setup to access this feature.",
          variant: "destructive",
        });
        onNavigate('/settings');
        onMobileNavigate?.();
        return;
      }
      onNavigate(item.href);
      onMobileNavigate?.();
      return;
    }
    
    // Test AI Agent tab: Show appropriate message based on user status
    if (item.href === '/test-ai-agent') {
      if (userStatus.isSetupIncomplete) {
        toast({
          title: "Setup Required",
          description: "Complete your account setup to access this feature.",
          variant: "destructive",
        });
        onNavigate('/settings');
        onMobileNavigate?.();
        return;
      }
      if (userStatus.userType === 'expired_trial') {
        toast({
          title: "Trial Expired",
          description: "Upgrade to a premium plan to access the AI agent.",
          variant: "destructive",
        });
        onNavigate('/settings');
        onMobileNavigate?.();
        return;
      }
      if (userStatus.userType === 'canceled_and_inactive') {
        toast({
          title: "Subscription Required",
          description: "Reactivate your subscription to access the AI agent.",
          variant: "destructive",
        });
        onNavigate('/settings');
        onMobileNavigate?.();
        return;
      }
      onNavigate(item.href);
      onMobileNavigate?.();
      return;
    }
    
    // Special handling for setup incomplete users
    if (userStatus.userType === 'setup_incomplete') {
      // Allow access to all navigation items
      onNavigate(item.href);
      onMobileNavigate?.();
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
      onMobileNavigate?.();
      return;
    }

    onNavigate(item.href);
    onMobileNavigate?.();
  };

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigationItems.map((item) => {
        const tooltipText = item.isRestricted 
          ? (item.href === '/whatsapp-booking-assistant' || item.href === '/test-ai-agent') && userStatus.isSetupIncomplete
            ? `${item.name} - Complete setup to access this feature`
            : item.href === '/test-ai-agent' && userStatus.userType === 'expired_trial'
              ? `${item.name} - Trial expired, upgrade required`
              : item.href === '/test-ai-agent' && userStatus.userType === 'canceled_and_inactive'
                ? `${item.name} - Subscription required`
                : userStatus.isSetupIncomplete 
                  ? `${item.name} - Setup required` 
                  : `${item.name} - Upgrade required`
          : item.name;

        return (
          <SidebarTooltip 
            key={item.name}
            content={tooltipText}
            disabled={isSidebarOpen || tooltipsDisabled}
          >
            <button
              onClick={() => handleItemClick(item)}
              className={`
                group flex items-center rounded-lg transition-all duration-200 w-full text-left hover:scale-105
                min-h-[44px] touch-manipulation mb-2
                ${isSidebarOpen 
                  ? 'px-2 py-2 text-sm font-medium' 
                  : 'w-12 h-12 justify-center p-0 mx-auto'
                }
                ${item.isActive 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : item.isRestricted
                    ? 'text-gray-500 hover:bg-gray-700 hover:text-gray-400 cursor-not-allowed'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <div className={`relative ${isSidebarOpen ? 'flex-shrink-0' : 'flex items-center justify-center'}`}>
                <item.icon
                  className={`${isSidebarOpen ? 'mr-3' : ''} h-5 w-5 transition-colors duration-200 ${
                    item.isActive 
                      ? 'text-white' 
                      : item.isRestricted 
                        ? 'text-gray-600' 
                        : 'text-gray-400 group-hover:text-white'
                  }`}
                />
                {item.isRestricted && (
                  <div className={`absolute ${isSidebarOpen ? '-top-1 -right-1' : '-top-1 -right-1'}`}>
                    <Lock className="h-3 w-3 text-red-400" />
                  </div>
                )}
              </div>
              {isSidebarOpen && (
                <span className="overflow-hidden">
                  {item.name}
                </span>
              )}
              {isSidebarOpen && item.isRestricted && (
                <div className="ml-auto">
                  <Lock className="h-4 w-4 text-red-400" />
                </div>
              )}
            </button>
          </SidebarTooltip>
        );
      })}
    </nav>
  );
}
