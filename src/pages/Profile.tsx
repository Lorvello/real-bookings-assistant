
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
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[Profile] User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    console.log('[Profile] User signing out');
    await signOut();
    navigate('/');
  };

  const handleCalendarIntegrationComplete = async () => {
    console.log('[Profile] Calendar integration completed successfully');
    setCalendarModalOpen(false);
    
    await triggerSync();
    
    setTimeout(() => {
      refetch();
      refetchAppointments();
    }, 1000);
  };

  const handleManualSync = async () => {
    console.log('[Profile] Manual calendar sync triggered');
    await triggerSync(true);
    
    setTimeout(() => {
      refetch();
      refetchAppointments();
    }, 1000);
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto py-8 px-4">
        <DashboardHeader 
          userName={userName}
          syncing={syncing}
          onManualSync={handleManualSync}
        />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <DashboardMainContent
            user={user}
            botActive={botActive}
            bookingTrends={bookingTrends}
            syncing={syncing}
            onCalendarModalOpen={() => setCalendarModalOpen(true)}
            onBotToggle={handleBotToggle}
          />

          <DashboardSidebar
            user={user}
            profile={profile}
            popularServices={popularServices}
            onSignOut={handleSignOut}
            onExportData={handleExportData}
          />
        </div>
      </div>
      
      <CalendarIntegrationModal
        open={calendarModalOpen}
        onOpenChange={setCalendarModalOpen}
        onComplete={handleCalendarIntegrationComplete}
      />
    </div>
  );
};

export default Profile;
