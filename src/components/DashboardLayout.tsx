
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

            {/* How it works section */}
            {isSidebarOpen && (
              <div className="mt-8 px-2">
                <div className="bg-gray-750 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center mb-3">
                    <FileText className="h-5 w-5 text-blue-400 mr-2" />
                    <h3 className="text-sm font-semibold text-white">
                      How it works: 🧾 Twee Plannen – Wat krijg je precies?
                    </h3>
                  </div>
                  
                  <div className="text-xs text-gray-300 space-y-3">
                    <p>
                      Je kunt kiezen uit twee abonnementen. Hier leggen we uit wat het verschil is, zodat je weet wat je kunt verwachten en wat je jouw klanten moet vertellen.
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center mb-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          <span className="text-white font-medium text-xs">Plan 1 – Standaard</span>
                        </div>
                        <ul className="text-xs text-gray-400 space-y-1 ml-4">
                          <li>• Je maakt een account aan bij ons</li>
                          <li>• Je krijgt één algemeen WhatsApp-nummer dat je deelt met andere bedrijven</li>
                          <li>• Dit nummer gebruik je om je afsprakenassistent te activeren</li>
                        </ul>
                        <div className="mt-2 p-2 bg-yellow-900/30 rounded border border-yellow-600/30">
                          <p className="text-xs text-yellow-300">
                            <strong>Let op:</strong> Omdat meerdere bedrijven ditzelfde nummer gebruiken, moet jouw klant bij het eerste bericht altijd vermelden:
                          </p>
                          <code className="text-xs text-yellow-200 bg-gray-800 px-2 py-1 rounded mt-1 block">
                            "Plan me in bij [jouw bedrijfsnaam]"
                          </code>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-green-400 mb-1">Voordeel:</p>
                          <ul className="text-xs text-gray-400 space-y-1">
                            <li>✅ Snel starten</li>
                            <li>✅ Goedkoop</li>
                            <li>✅ Geen installatie nodig</li>
                          </ul>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center mb-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          <span className="text-white font-medium text-xs">Plan 2 – Premium (eigen nummer & branding)</span>
                        </div>
                        <ul className="text-xs text-gray-400 space-y-1 ml-4">
                          <li>• Je krijgt je eigen unieke WhatsApp-nummer</li>
                          <li>• Dat nummer is alleen van jou, dus klanten hoeven jouw bedrijfsnaam niet te noemen</li>
                          <li>• Je kunt ook eigen branding toevoegen (zoals naam, profielfoto, beschrijving)</li>
                          <li>• Dit is ideaal voor een professionele uitstraling en volledige controle</li>
                        </ul>
                        <div className="mt-2 p-2 bg-blue-900/30 rounded border border-blue-600/30">
                          <p className="text-xs text-blue-300 mb-1">
                            <strong>Hoe aanvragen?</strong>
                          </p>
                          <p className="text-xs text-blue-200">
                            👉 Boek een korte call met ons via: <br />
                            <span className="text-blue-400 underline">bookingsassistentie.com/afspraak</span>
                          </p>
                          <p className="text-xs text-blue-200 mt-1">
                            Tijdens het gesprek regelen we de koppeling en activeren we je persoonlijke nummer.
                          </p>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-blue-400 mb-1">Voordeel:</p>
                          <ul className="text-xs text-gray-400 space-y-1">
                            <li>✅ Volledige controle</li>
                            <li>✅ Geen verwarring voor klanten</li>
                            <li>✅ Professionele look & feel</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
