import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAppointments } from '@/hooks/useAppointments';
import { useServices } from '@/hooks/useServices';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { CalendarIntegrationModal } from '@/components/CalendarIntegrationModal';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardMainContent } from '@/components/dashboard/DashboardMainContent';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

/**
 * 🎯 PROFILE/DASHBOARD PAGE - Het ENIGE Actieve Dashboard
 * =======================================================
 * 
 * ⚠️ BELANGRIJK: Dit is het ENIGE dashboard in het systeem.
 * Er is geen "Dashboard 1" vs "Dashboard 2" - dit is DE dashboard.
 * Alle gebruikers, alle functies, alle kalender integraties gebruiken dit dashboard.
 * 
 * Route: /profile (na inloggen)
 * Functionaliteit: Volledig business dashboard met prominente disconnect opties
 */

const Profile = () => {
  // 🔐 AUTHENTICATION & NAVIGATION
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  
  // 📊 STATE MANAGEMENT  
  const [botActive, setBotActive] = useState(true);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  // 🔗 DATA HOOKS - Core dashboard data sources
  const { profile, loading: profileLoading, refetch } = useProfile(user);
  const { appointments, refetch: refetchAppointments } = useAppointments(user);
  const { getPopularServices } = useServices(user);
  const { syncing, triggerSync } = useCalendarSync(user);

  // 🔄 REAL-TIME UPDATES
  // Critical voor live dashboard updates zonder page refresh
  useRealTimeUpdates({
    user,
    onAppointmentUpdate: () => {
      console.log('[Profile] Real-time appointment update received');
      refetchAppointments();
    },
    onCalendarUpdate: () => {
      console.log('[Profile] Real-time calendar update received');
      refetchAppointments();
    },
    onSetupProgressUpdate: () => {
      console.log('[Profile] Real-time setup progress update received');
      refetch();
    }
  });

  // 🚪 AUTHENTICATION GUARD
  // Redirect naar login als niet authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[Profile] User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
  }, [user, authLoading, navigate]);

  /**
   * 🚪 Handles user logout with proper cleanup
   */
  const handleSignOut = async () => {
    console.log('[Profile] User signing out');
    await signOut();
    navigate('/');
  };

  /**
   * 📅 Handles successful calendar integration completion
   * Triggered na successful OAuth flow completion
   */
  const handleCalendarIntegrationComplete = async () => {
    console.log('[Profile] Calendar integration completed successfully');
    setCalendarModalOpen(false);
    
    // 🔄 Trigger calendar sync voor immediate data
    await triggerSync();
    
    // 📊 Refresh dashboard data na slight delay
    setTimeout(() => {
      refetch();
      refetchAppointments();
    }, 1000);
  };

  /**
   * 🔄 Handles manual calendar sync trigger
   * Available via dashboard sync button
   */
  const handleManualSync = async () => {
    console.log('[Profile] Manual calendar sync triggered');
    await triggerSync(true);
    
    // 📊 Refresh data na sync completion
    setTimeout(() => {
      refetch();
      refetchAppointments();
    }, 1000);
  };

  /**
   * 📊 Exports appointment data as CSV
   * Business feature voor data portability
   */
  const handleExportData = () => {
    console.log('[Profile] Exporting appointment data as CSV');
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Time,Client,Service,Status,Price\n"
      + appointments.map(apt => 
          `${apt.appointment_date},${apt.appointment_time},${apt.client_name},${apt.service_name},${apt.status},${apt.price || ''}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `appointments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * 🤖 Toggles WhatsApp bot active status
   * Controls autonomous booking system activation
   */
  const handleBotToggle = () => {
    console.log('[Profile] Toggling bot status:', !botActive);
    setBotActive(!botActive);
  };

  // 🔄 LOADING STATES
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-600">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  // 🚫 UNAUTHENTICATED STATE
  if (!user) {
    return null;
  }

  // 📊 DASHBOARD DATA PREPARATION
  const generateBookingTrends = () => {
    const trends = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr);
      trends.push({
        day: (14 - i).toString(),
        bookings: dayAppointments.length
      });
    }
    
    return trends;
  };

  const bookingTrends = generateBookingTrends();
  const popularServices = getPopularServices(appointments);
  const userName = profile?.full_name || user.email?.split('@')[0] || 'there';

  // 🎨 MAIN DASHBOARD RENDER MET DUIDELIJKE IDENTIFICATIE
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 🎯 DASHBOARD IDENTIFICATIE BANNER */}
      <div className="bg-green-600 text-white py-2">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">
              Actief Dashboard - Alle kalender integraties en functies werken hier
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* 📊 DASHBOARD HEADER */}
        <DashboardHeader 
          userName={userName}
          syncing={syncing}
          onManualSync={handleManualSync}
        />

        {/* 🎯 MAIN DASHBOARD GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* 📊 MAIN CONTENT AREA */}
          <DashboardMainContent
            user={user}
            botActive={botActive}
            bookingTrends={bookingTrends}
            syncing={syncing}
            onCalendarModalOpen={() => setCalendarModalOpen(true)}
            onBotToggle={handleBotToggle}
          />

          {/* 📋 SIDEBAR CONTENT */}
          <DashboardSidebar
            user={user}
            profile={profile}
            popularServices={popularServices}
            onSignOut={handleSignOut}
            onExportData={handleExportData}
          />
        </div>
      </div>
      
      {/* 📅 CALENDAR INTEGRATION MODAL */}
      <CalendarIntegrationModal
        open={calendarModalOpen}
        onOpenChange={setCalendarModalOpen}
        onComplete={handleCalendarIntegrationComplete}
      />
    </div>
  );
};

export default Profile;

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Deze Profile/Dashboard pagina is de KERN van het Affable Bot systeem.
 * Het is waar dienstverleners hun complete business kunnen monitoren en beheren.
 * 
 * CRITICAL ROUTING REQUIREMENT:
 * - Deze component MOET identical functioneren in Lovable preview EN deployed environment
 * - Inconsistenties in routing kunnen leiden tot split user experience
 * - Alle calendar management functionaliteit moet consistent beschikbaar zijn
 * 
 * KEY BUSINESS FUNCTIONS:
 * - Real-time dashboard updates voor immediate business insights
 * - Calendar connection management voor core system functionality
 * - Setup progress tracking voor guided onboarding experience
 * - WhatsApp bot management voor autonomous booking control
 * - Business metrics visualization voor performance monitoring
 * 
 * INTEGRATION DEPENDENCIES:
 * - DashboardHeader: User welcome en sync controls
 * - DashboardMainContent: Core business widgets (metrics, calendar, bot status)
 * - DashboardSidebar: Account info, quick actions, popular services
 * - CalendarIntegrationModal: OAuth flow voor calendar connections
 * - Real-time hooks: Live updates zonder page refresh
 * 
 * SUCCESS METRICS TARGET:
 * - Dashboard load time < 3 seconden
 * - Calendar connection success rate > 95%
 * - Setup completion rate > 80% binnen 10 minuten
 * - User engagement > 3x per week dashboard visits
 * - Zero routing inconsistencies tussen environments
 */
