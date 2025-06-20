
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Home,
  Settings,
  MessageCircle,
  UserCircle,
  LogOut,
  Menu,
  X,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Kalender', href: '/calendar', icon: Calendar },
  { name: 'WhatsApp', href: '/conversations', icon: MessageCircle },
  { name: 'How it works', href: '/how-it-works', icon: FileText },
  { name: 'Instellingen', href: '/settings', icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleNavigation = (href: string) => {
    console.log('Navigating to:', href);
    navigate(href);
  };

  return (
    <div className="flex h-screen bg-gray-900 w-full">
      {/* Sidebar - Always visible */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-gray-800 transition-all duration-300 ease-in-out flex-shrink-0`}>
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-700">
            <h1 className={`text-xl font-bold text-white transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              Bookings Assistant
            </h1>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-700 transition-colors"
            >
              {isSidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`
                    group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors w-full text-left
                    ${isActive 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    }`}
                  />
                  <span className={`transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                    {item.name}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCircle className="h-10 w-10 text-gray-400" />
              </div>
              {isSidebarOpen && (
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
              )}
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="mt-3 flex w-full items-center justify-start rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white"
            >
              <LogOut className="mr-2 h-5 w-5" />
              {isSidebarOpen && <span>Uitloggen</span>}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="h-full">
          {children}
        </main>
      </div>
    </div>
  );
}
