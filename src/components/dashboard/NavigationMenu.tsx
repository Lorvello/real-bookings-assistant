
import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: NavItem[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Bookings', href: '/bookings', icon: BookOpen },
  { name: 'Availability', href: '/availability', icon: Clock },
  { 
    name: 'WhatsApp', 
    href: '/conversations', 
    icon: MessageCircle,
    subItems: [
      { name: 'Booking Assistant', href: '/whatsapp-booking-assistant', icon: Bot },
    ]
  },
  { name: 'Booking Assistant', href: '/whatsapp-booking-assistant', icon: Bot },
  { name: 'Test your AI agent', href: '/test-ai-agent', icon: Eye },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface NavigationMenuProps {
  isSidebarOpen: boolean;
  onNavigate: (href: string) => void;
}

export function NavigationMenu({ isSidebarOpen, onNavigate }: NavigationMenuProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Auto-expand WhatsApp menu when on WhatsApp-related pages
  useEffect(() => {
    const whatsappRelatedPaths = ['/conversations', '/whatsapp-booking-assistant'];
    if (whatsappRelatedPaths.some(path => location.pathname.startsWith(path))) {
      setExpandedItems(prev => prev.includes('WhatsApp') ? prev : [...prev, 'WhatsApp']);
    }
  }, [location.pathname]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isSubItemActive = (item: NavItem) => {
    if (!item.subItems) return false;
    return item.subItems.some(subItem => location.pathname === subItem.href);
  };

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        const isExpanded = expandedItems.includes(item.name);
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isSubActive = isSubItemActive(item);

        return (
          <div key={item.name} className="space-y-1">
            <button
              onClick={() => {
                if (hasSubItems) {
                  toggleExpanded(item.name);
                }
                onNavigate(item.href);
              }}
              className={`
                group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200 w-full text-left hover:scale-105
                ${isActive || isSubActive
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
              title={item.name}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                  isActive || isSubActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`}
              />
              <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                {item.name}
              </span>
              {hasSubItems && isSidebarOpen && (
                <div className="ml-auto">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              )}
            </button>
            
            {/* Sub-items */}
            {hasSubItems && isExpanded && isSidebarOpen && (
              <div className="ml-4 space-y-1">
                {item.subItems?.map((subItem) => {
                  const isSubActive = location.pathname === subItem.href;
                  return (
                    <button
                      key={subItem.name}
                      onClick={() => onNavigate(subItem.href)}
                      className={`
                        group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200 w-full text-left hover:scale-105
                        ${isSubActive 
                          ? 'bg-green-500 text-white shadow-lg' 
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }
                      `}
                      title={subItem.name}
                    >
                      <subItem.icon
                        className={`mr-3 h-4 w-4 flex-shrink-0 transition-colors duration-200 ${
                          isSubActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                        }`}
                      />
                      <span className="transition-all duration-300 opacity-100 translate-x-0">
                        {subItem.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
