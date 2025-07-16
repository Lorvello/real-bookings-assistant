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
  AlertCircle
} from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresSetup?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Bookings', href: '/bookings', icon: BookOpen, requiresSetup: true },
  { name: 'Availability', href: '/availability', icon: Clock, requiresSetup: true },
  { name: 'WhatsApp', href: '/conversations', icon: MessageCircle, requiresSetup: true },
  { name: 'Test your AI agent', href: '/test-ai-agent', icon: Bot, requiresSetup: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface EnhancedNavigationMenuProps {
  isSidebarOpen: boolean;
  onNavigate: (href: string) => void;
}

export function EnhancedNavigationMenu({ isSidebarOpen, onNavigate }: EnhancedNavigationMenuProps) {
  const location = useLocation();
  const { isTrialActive } = useTrialStatus();
  const { completionPercentage } = useOnboardingProgress();

  const isSetupIncomplete = isTrialActive && completionPercentage < 70;

  const handleItemClick = (item: NavItem) => {
    if (item.requiresSetup && isSetupIncomplete) {
      // Show guidance message or redirect to setup
      onNavigate('/settings');
      return;
    }
    onNavigate(item.href);
  };

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        const needsSetup = item.requiresSetup && isSetupIncomplete;
        
        return (
          <button
            key={item.name}
            onClick={() => handleItemClick(item)}
            className={`
              group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200 w-full text-left hover:scale-105
              ${isActive 
                ? 'bg-green-600 text-white shadow-lg' 
                : needsSetup
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }
            `}
            title={needsSetup ? 'Complete setup first' : item.name}
          >
            <div className="relative">
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                  isActive ? 'text-white' : needsSetup ? 'text-gray-500' : 'text-gray-400 group-hover:text-white'
                }`}
              />
              {needsSetup && (
                <Lock className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400" />
              )}
            </div>
            <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
              {item.name}
            </span>
            {needsSetup && isSidebarOpen && (
              <AlertCircle className="ml-auto h-4 w-4 text-yellow-400" />
            )}
          </button>
        );
      })}
    </nav>
  );
}