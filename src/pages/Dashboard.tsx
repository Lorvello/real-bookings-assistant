
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendars } from '@/hooks/useCalendars';
import { DashboardTabs } from '@/components/DashboardTabs';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { calendars, loading: calendarsLoading } = useCalendars();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Define keyframes for animations using CSS-in-JS
  const floatKeyframes = `
    @keyframes float {
      0%, 100% {
        transform: translateY(0px) rotate(0deg) scale(1);
      }
      25% {
        transform: translateY(-20px) rotate(2deg) scale(1.02);
      }
      50% {
        transform: translateY(-10px) rotate(-1deg) scale(0.98);
      }
      75% {
        transform: translateY(-15px) rotate(1deg) scale(1.01);
      }
    }
  `;

  if (authLoading || calendarsLoading) {
    return (
      <DashboardLayout>
        <style dangerouslySetInnerHTML={{ __html: floatKeyframes }} />
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
          {/* Organic Loading Background */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-tl from-purple-500/20 to-transparent rounded-full blur-2xl animate-pulse delay-700"></div>
            <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-bl from-blue-500/25 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>
          </div>
          
          <div className="relative z-10 text-center space-y-8">
            {/* Liquid Loading Animation */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute w-full h-full bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-full animate-spin opacity-75" 
                   style={{
                     clipPath: 'polygon(50% 0%, 80% 30%, 100% 50%, 80% 70%, 50% 100%, 20% 70%, 0% 50%, 20% 30%)'
                   }}></div>
              <div className="absolute inset-2 bg-gradient-to-br from-card to-background rounded-full"></div>
              <div className="absolute inset-4 bg-primary/20 rounded-full animate-pulse"></div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-400 bg-clip-text text-transparent">
                Dashboard wordt geladen
              </h2>
              <p className="text-muted-foreground">Een moment geduld, we bereiden alles voor...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  const activeCalendar = calendars.find(cal => cal.is_active) || calendars[0];

  if (!activeCalendar) {
    return (
      <DashboardLayout>
        <style dangerouslySetInnerHTML={{ __html: floatKeyframes }} />
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
          {/* Organic Background Shapes */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl"></div>
            <div className="absolute bottom-20 right-20 w-64 h-64 bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-xl"></div>
          </div>
          
          <div className="relative z-10 text-center space-y-8 max-w-md mx-auto px-6">
            {/* Organic Icon Container */}
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/15 to-blue-500/10 rounded-full blur-xl"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl border border-primary/20 shadow-xl"
                   style={{
                     borderRadius: '30% 70% 60% 40% / 40% 50% 60% 30%'
                   }}>
                <div className="absolute inset-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg"></div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-400 bg-clip-text text-transparent">
                Geen kalender beschikbaar
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Maak eerst een kalender aan om het dashboard te kunnen gebruiken en je afspraken te beheren
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <style dangerouslySetInnerHTML={{ __html: floatKeyframes }} />
      <div className="min-h-screen relative overflow-hidden">
        {/* Liquid Background Layer */}
        <div className="absolute inset-0">
          {/* Primary Organic Shape */}
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent blur-3xl"
               style={{
                 borderRadius: '40% 60% 70% 30% / 30% 40% 60% 70%',
                 animation: 'float 20s ease-in-out infinite'
               }}></div>
          
          {/* Secondary Organic Shape */}
          <div className="absolute top-1/3 -right-32 w-80 h-80 bg-gradient-to-tl from-purple-500/12 via-blue-500/8 to-transparent blur-2xl"
               style={{
                 borderRadius: '60% 40% 30% 70% / 70% 30% 40% 60%',
                 animation: 'float 25s ease-in-out infinite reverse'
               }}></div>
          
          {/* Tertiary Organic Shape */}
          <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-tr from-green-500/10 via-primary/6 to-transparent blur-xl"
               style={{
                 borderRadius: '50% 70% 40% 60% / 60% 50% 70% 40%',
                 animation: 'float 30s ease-in-out infinite'
               }}></div>
          
          {/* Flowing Grid Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="w-full h-full"
                 style={{
                   backgroundImage: `radial-gradient(circle at 25% 25%, rgba(16,185,129,0.3) 1px, transparent 1px),
                                   radial-gradient(circle at 75% 75%, rgba(16,185,129,0.2) 1px, transparent 1px)`,
                   backgroundSize: '60px 60px, 40px 40px'
                 }}></div>
          </div>
        </div>

        <div className="relative z-10 p-8 space-y-12">
          {/* Organic Header */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-purple-500/15 to-blue-500/20 blur-2xl"
                 style={{
                   borderRadius: '40% 60% 50% 70% / 60% 40% 70% 50%'
                 }}></div>
            
            <div className="relative bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-2xl border border-primary/20 shadow-2xl p-8"
                 style={{
                   borderRadius: '2rem 6rem 2rem 6rem / 3rem 2rem 5rem 2rem'
                 }}>
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-foreground via-primary to-purple-400 bg-clip-text text-transparent">
                      Dashboard
                    </h1>
                    <div className="px-4 py-1.5 bg-gradient-to-r from-primary/20 via-primary/15 to-purple-500/20 text-primary text-sm font-bold border border-primary/30 shadow-lg"
                         style={{
                           borderRadius: '1rem 2rem 1rem 2rem'
                         }}>
                      Live
                    </div>
                  </div>
                  <p className="text-muted-foreground text-lg font-medium">
                    Realtime overzicht van je boekingen en performance voor{' '}
                    <span className="font-bold text-foreground bg-gradient-to-r from-primary/20 to-transparent px-2 py-1 rounded-xl">
                      {activeCalendar.name}
                    </span>
                  </p>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right space-y-2">
                    <div className="text-sm text-muted-foreground font-semibold">Actieve kalender</div>
                    <div className="font-bold text-foreground text-lg">{activeCalendar.name}</div>
                  </div>
                  <div className="relative">
                    <div className="w-6 h-6 bg-gradient-to-r from-primary to-green-400 rounded-full animate-pulse shadow-lg"></div>
                    <div className="absolute inset-0 w-6 h-6 bg-primary/30 rounded-full animate-ping"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Organic Dashboard Tabs */}
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-br from-primary/15 via-transparent to-purple-500/15 blur-3xl"
                 style={{
                   borderRadius: '50% 80% 30% 70% / 40% 60% 80% 20%'
                 }}></div>
            <div className="relative">
              <DashboardTabs calendarId={activeCalendar.id} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
