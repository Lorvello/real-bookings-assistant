
import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calendar,
  Home,
  Settings,
  MessageCircle,
  Clock,
  Eye,
  BookOpen,
  Bot,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Bookings', href: '/bookings', icon: BookOpen },
  { name: 'Availability', href: '/availability', icon: Clock },
  { name: 'WhatsApp', href: '/conversations', icon: MessageCircle },
  { name: 'Test your AI agent', href: '/test-ai-agent', icon: Bot },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface NavigationMenuProps {
  isSidebarOpen: boolean;
  onNavigate: (href: string) => void;
}

export function NavigationMenu({ isSidebarOpen, onNavigate }: NavigationMenuProps) {
  const location = useLocation();

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        const isBotIcon = item.icon === Bot;
        
        return (
          <button
            key={item.name}
            onClick={() => onNavigate(item.href)}
            className={`
              group flex items-center rounded-lg px-2 text-sm font-medium transition-all duration-200 w-full text-left hover:scale-105
              ${isBotIcon && !isSidebarOpen ? 'py-1' : 'py-2'}
              ${isActive 
                ? 'bg-green-600 text-white shadow-lg' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }
            `}
            title={item.name}
          >
            <item.icon
              className={`mr-3 flex-shrink-0 transition-colors duration-200 ${
                isBotIcon ? 'h-4 w-4' : 'h-5 w-5'
              } ${
                isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
              }`}
            />
            <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
              {item.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
