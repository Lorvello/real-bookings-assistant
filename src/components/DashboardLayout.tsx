
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Home,
  Settings,
  MessageCircle,
  UserCircle,
  LogOut,
  PanelLeft,
  PanelRight,
  Bot,
  ArrowLeft,
  Clock,
  Eye,
  BookOpen,
  Plus,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';

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

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { selectedCalendar, calendars, selectCalendar, selectAllCalendars, viewingAllCalendars, loading } = useCalendarContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleNavigation = (href: string) => {
    console.log('Navigating to:', href);
    navigate(href);
  };

  const handleBackToWebsite = () => {
    console.log('Navigating back to website homepage');
    navigate('/');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-900 w-full">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-gray-800 transition-all duration-300 ease-in-out flex-shrink-0 relative`}>
        <div className="flex h-full flex-col">
          {/* Header with Logo and Toggle */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-700">
            {/* Logo - only show when expanded */}
            {isSidebarOpen && (
              <h1 className="text-xl font-bold text-white transition-all duration-300">
                Bookings Assistant
              </h1>
            )}
            
            {/* Toggle Button - positioned correctly */}
            <button
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700 transition-all duration-200 hover:scale-105 group flex-shrink-0"
              title={isSidebarOpen ? 'Sidebar inklappen' : 'Sidebar uitklappen'}
            >
              {isSidebarOpen ? (
                <PanelLeft className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              ) : (
                <PanelRight className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              )}
            </button>
          </div>

          {/* Back to Website Button */}
          <div className="px-2 py-2 border-b border-gray-700">
            <button
              onClick={handleBackToWebsite}
              className="group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200 w-full text-left text-gray-300 hover:bg-gray-700 hover:text-white hover:scale-105"
              title="Terug naar website"
            >
              <ArrowLeft
                className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-white transition-colors duration-200"
              />
              <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                Back to Website
              </span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`
                    group flex items-center rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200 w-full text-left hover:scale-105
                    ${isActive 
                      ? 'bg-green-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                  title={item.name}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
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

          {/* Calendar Switcher Section */}
          {isSidebarOpen && !loading && calendars.length > 0 && (
            <div className="border-t border-gray-700 p-4 transition-all duration-300">
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Switch Calendar
                </p>
              </div>
              
              {/* Calendar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-200 hover:scale-105"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      {viewingAllCalendars ? (
                        <>
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex-shrink-0" />
                          <span className="truncate">All calendars</span>
                        </>
                      ) : (
                        <>
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: selectedCalendar?.color || '#3B82F6' }}
                          />
                          <span className="truncate">
                            {selectedCalendar ? selectedCalendar.name : 'Select calendar'}
                          </span>
                        </>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 transition-transform duration-200" />
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-64 bg-gray-800 border-gray-700" align="end">
                  <DropdownMenuLabel className="text-gray-300">Select Calendar</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  
                  {/* All calendars option */}
                  <DropdownMenuItem
                    onClick={() => selectAllCalendars()}
                    className="flex items-center space-x-3 p-3 text-gray-300 hover:bg-gray-700 focus:bg-gray-700"
                  >
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-green-500 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">All calendars</span>
                        <Badge variant="outline" className="text-xs border-gray-600">Mixed</Badge>
                      </div>
                      <p className="text-xs text-gray-400">
                        View all appointments together
                      </p>
                    </div>
                    {viewingAllCalendars && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-gray-700" />
                  
                  {calendars.map((calendar) => (
                    <DropdownMenuItem
                      key={calendar.id}
                      onClick={() => selectCalendar(calendar)}
                      className="flex items-center space-x-3 p-3 text-gray-300 hover:bg-gray-700 focus:bg-gray-700"
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: calendar.color || '#3B82F6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium truncate">{calendar.name}</span>
                          {calendar.is_default && (
                            <Badge variant="outline" className="text-xs border-gray-600">Default</Badge>
                          )}
                        </div>
                        {calendar.description && (
                          <p className="text-xs text-gray-400 truncate">
                            {calendar.description}
                          </p>
                        )}
                      </div>
                      {!viewingAllCalendars && selectedCalendar?.id === calendar.id && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator className="bg-gray-700" />
                  
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault();
                      setShowCreateDialog(true);
                    }}
                    className="text-gray-300 hover:bg-gray-700 focus:bg-gray-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New calendar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* User Profile Section */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCircle className="h-10 w-10 text-gray-400" />
              </div>
              {isSidebarOpen && (
                <div className="ml-3 min-w-0 flex-1 transition-all duration-300">
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
              className="mt-3 flex w-full items-center justify-start rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white transition-all duration-200 hover:scale-105"
              title="Uitloggen"
            >
              <LogOut className="mr-2 h-5 w-5" />
              {isSidebarOpen && <span className="transition-all duration-300">Sign Out</span>}
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

      {/* Create Calendar Dialog */}
      <CreateCalendarDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        trigger="button"
      />
    </div>
  );
}
