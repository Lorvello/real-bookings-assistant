// DEV-ONLY no-auth visual harness for the Users/Profile settings surface (launch-ready-loop §7).
// UserManagement is hook-heavy (CalendarContext / useCalendarMembers / useTeamInvitations /
// useAccessControl / SettingsContext), but the heavy NEW UI is PURE props: ProfileSection,
// TeamMembersSection (populated / loading / empty / Pro-locked) and AddTeamMemberDialog. We mount
// the REAL components against local mock state (AuthProvider + QueryClient only so any in-tree
// hook doesn't crash). SetPasswordSection is auth-conditional (Google-only accounts) and is
// reviewed live, not here. Not in prod build.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import '@/i18n'; // bootstrap i18n so NL renders in this standalone harness (sim sweep)
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { SettingsSaveBar } from '@/components/settings/SettingsSaveBar';
import { ProfileSection } from '@/components/settings/users/ProfileSection';
import { TeamMembersSection, type TeamUser } from '@/components/settings/users/TeamMembersSection';
import { AddTeamMemberDialog } from '@/components/settings/users/AddTeamMemberDialog';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const MOCK_CALENDARS = [
  { id: 'c1', name: 'Glow Studio — Main', is_default: true },
  { id: 'c2', name: 'Glow Studio — Colour Room' },
];

const MOCK_USERS: TeamUser[] = [
  { id: 'owner', user: { full_name: 'Mathew Groen', email: 'mathew@glowstudio.nl' }, role: 'owner', calendar: { name: 'All Calendars' }, type: 'member' },
  { id: 'm1', user: { full_name: 'Sanne de Vries', email: 'sanne@glowstudio.nl' }, role: 'editor', calendar: { name: 'Glow Studio — Main' }, type: 'member' },
  { id: 'm2', user: { full_name: 'Tariq Hassan', email: 'tariq@glowstudio.nl' }, role: 'viewer', calendar: { name: 'Glow Studio — Colour Room' }, type: 'member' },
  { id: 'i1', user: { full_name: 'Nora Bakker', email: 'nora@example.com' }, role: 'viewer', calendar: { name: 'Glow Studio — Main' }, type: 'invitation', status: 'pending', expires_at: '2026-07-01T00:00:00Z' },
  { id: 'i2', user: { full_name: 'Liam Jansen', email: 'liam@example.com' }, role: 'editor', calendar: { name: 'Glow Studio — Main' }, type: 'invitation', status: 'expired' },
];

function Harness() {
  const [profile, setProfile] = useState({ full_name: 'Mathew Groen', email: 'mathew@glowstudio.nl', phone: '+31612345678' });
  const [addOpen, setAddOpen] = useState(true);
  const [inviteName, setInviteName] = useState('Nora Bakker');
  const [inviteEmail, setInviteEmail] = useState('nora@example.com');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [inviteCal, setInviteCal] = useState('');

  const noop = () => {};

  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={150}>
            <div className="dark main-scrollbar h-screen overflow-y-auto bg-background p-3 md:p-8">
              <div className="mx-auto max-w-6xl">
                <SimplePageHeader title="Settings" />
                <div className="mt-6 flex flex-col gap-5 md:mt-8 md:flex-row md:gap-8">
                  <aside className="md:w-60 md:shrink-0" />
                  <div className="min-w-0 flex-1 space-y-8 pb-24 md:max-w-3xl">
                    <ProfileSection
                      fullName={profile.full_name}
                      email={profile.email}
                      phone={profile.phone}
                      onChange={(f, v) => setProfile((p) => ({ ...p, [f]: v }))}
                    />

                    {/* Populated */}
                    <TeamMembersSection
                      users={MOCK_USERS}
                      loading={false}
                      locked={false}
                      canAddMember
                      onAddMember={() => setAddOpen(true)}
                      onUnlock={noop}
                      onRoleChange={noop}
                      onRemove={noop}
                      onResend={noop}
                      onCancelInvite={noop}
                    />

                    {/* Empty */}
                    <TeamMembersSection
                      users={[]}
                      loading={false}
                      locked={false}
                      canAddMember
                      onAddMember={() => setAddOpen(true)}
                      onUnlock={noop}
                      onRoleChange={noop}
                      onRemove={noop}
                      onResend={noop}
                      onCancelInvite={noop}
                    />

                    {/* Pro-locked */}
                    <TeamMembersSection
                      users={[]}
                      loading={false}
                      locked
                      canAddMember={false}
                      onAddMember={noop}
                      onUnlock={noop}
                      onRoleChange={noop}
                      onRemove={noop}
                      onResend={noop}
                      onCancelInvite={noop}
                    />

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setAddOpen(true)}>Open invite dialog</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <AddTeamMemberDialog
              open={addOpen}
              onOpenChange={setAddOpen}
              name={inviteName}
              email={inviteEmail}
              role={inviteRole}
              calendarId={inviteCal}
              calendars={MOCK_CALENDARS}
              submitting={false}
              onNameChange={setInviteName}
              onEmailChange={setInviteEmail}
              onRoleChange={setInviteRole}
              onCalendarChange={setInviteCal}
              onSubmit={noop}
            />

            <SettingsSaveBar dirty saving={false} onSave={noop} onDiscard={noop} />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
