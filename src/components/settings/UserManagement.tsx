import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useCalendarMembers } from '@/hooks/useCalendarMembers';
import { useTeamInvitations } from '@/hooks/useTeamInvitations';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { useAccessControl } from '@/hooks/useAccessControl';
import { SetPasswordSection } from './SetPasswordSection';
import { SettingsSaveBar } from './SettingsSaveBar';
import { ProfileSection } from './users/ProfileSection';
import { TeamMembersSection, type TeamUser } from './users/TeamMembersSection';
import { AddTeamMemberDialog } from './users/AddTeamMemberDialog';

interface UserManagementProps {
  externalBusinessData?: any;
  externalProfileData?: any;
  externalLoading?: boolean;
}

/**
 * Orchestrator for the Users/Profile settings surface. Owns all hooks, buffered
 * profile state and the team handlers; renders the PURE presentational sections
 * (ProfileSection / TeamMembersSection / AddTeamMemberDialog) so the heavy visual
 * UI stays harness-mountable. Replaces the old nested Tabs-in-a-Card (which read
 * "cheap / too Lovable") with calm stacked SettingsSections + the shared SaveBar.
 */
export const UserManagement = ({
  externalProfileData,
  externalLoading,
}: UserManagementProps = {}) => {
  const { t } = useTranslation('settings');
  const { calendars } = useCalendarContext();
  const { members, loading, inviteMember, removeMember, updateMemberRole, refetch } = useCalendarMembers();
  const {
    invitations,
    loading: invitationsLoading,
    cancelInvitation,
    resendInvitation,
    refetch: refetchInvitations,
  } = useTeamInvitations();
  const { profileData, saveFields, refetch: refetchSettings } = useSettingsContext();
  const { toast } = useToast();
  const { accessControl, requireAccess } = useAccessControl();

  // Add member dialog state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor' | 'viewer'>('viewer');
  const [newUserCalendarId, setNewUserCalendarId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buffered profile changes (no auto-save — the SaveBar commits them)
  const [localProfileData, setLocalProfileData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isProfileInitialized, setIsProfileInitialized] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseProfile = externalProfileData || profileData;

  // Sync local state when REAL server data is loaded (has id)
  useEffect(() => {
    if (baseProfile?.id) {
      setLocalProfileData(baseProfile);
      setIsProfileInitialized(true);
    }
  }, [baseProfile?.id]);

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  // The profile fields this tab owns. PARTIAL save: only these are written, so the
  // Profile tab can never clobber the AI-Knowledge tab's business/social fields.
  const PROFILE_FIELDS = ['full_name', 'phone'];

  // Real local≠server diff drives the SaveBar (never a hang-able "initialized" flag).
  const hasUnsavedChanges = useMemo(() => {
    if (!isProfileInitialized || !localProfileData || !baseProfile) return false;
    return PROFILE_FIELDS.some(
      (f) => (localProfileData[f] || '') !== (baseProfile[f] || ''),
    );
  }, [isProfileInitialized, localProfileData, baseProfile]);

  // Warn before leaving with unsaved changes (shared across every SaveBar surface)
  useUnsavedChangesWarning(hasUnsavedChanges);

  const saveAllChanges = async () => {
    if (!localProfileData) return;
    const changes: Record<string, any> = {};
    for (const k of PROFILE_FIELDS) {
      const localVal = localProfileData[k] ?? '';
      const serverVal = (baseProfile as any)?.[k] ?? '';
      if (localVal !== serverVal) changes[k] = localVal;
    }
    if (Object.keys(changes).length === 0) return;

    setIsSaving(true);
    try {
      const success = await saveFields(changes);
      if (success) {
        await refetchSettings();
        setJustSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setJustSaved(false), 2500);
        toast({ title: t('settings.users.toast.saveSuccess.title', 'Changes saved'), description: t('settings.users.toast.saveSuccess.description', 'Your profile has been updated.') });
      }
    } catch (error) {
      toast({
        title: t('settings.users.toast.saveError.title', 'Error'),
        description: t('settings.users.toast.saveError.description', 'Failed to save changes. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const discardChanges = () => setLocalProfileData(baseProfile);

  const updateLocalProfile = useCallback((field: 'full_name' | 'phone', value: string) => {
    setLocalProfileData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  // Only refetch when nothing is mid-flight
  const stableRefetch = useCallback(() => {
    if (!loading && !invitationsLoading) {
      refetch();
      refetchInvitations();
    }
  }, [refetch, refetchInvitations, loading, invitationsLoading]);

  const handleAddUser = useCallback(async () => {
    if (!newUserEmail.trim()) {
      toast({ title: t('settings.users.toast.emailRequired.title', 'Email required'), description: t('settings.users.toast.emailRequired.description', 'Please enter an email address'), variant: 'destructive' });
      return;
    }
    const defaultCalendar = calendars.find((cal) => cal.is_default) || calendars[0];
    if (!defaultCalendar) {
      toast({
        title: t('settings.users.toast.noCalendar.title', 'No calendar available'),
        description: t('settings.users.toast.noCalendar.description', 'You need at least one calendar to add members'),
        variant: 'destructive',
      });
      return;
    }
    const targetCalendarId = newUserCalendarId || defaultCalendar.id;

    setIsSubmitting(true);
    try {
      // inviteMember owns its own success/error toasts (incl. the specific reason,
      // e.g. team-member limit reached). Only clear + close when it actually succeeded.
      const ok = await inviteMember(newUserEmail, targetCalendarId, newUserRole, newUserName);
      if (ok) {
        setNewUserEmail('');
        setNewUserName('');
        setNewUserRole('viewer');
        setNewUserCalendarId('');
        setIsAddUserOpen(false);
        stableRefetch();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [newUserEmail, newUserName, newUserRole, newUserCalendarId, calendars, inviteMember, stableRefetch, toast, t]);

  const handleRoleChange = useCallback(async (memberId: string, newRole: 'editor' | 'viewer') => {
    try {
      await updateMemberRole(memberId, newRole);
      stableRefetch();
    } catch {
      toast({ title: t('settings.users.toast.roleError.title', 'Error updating role'), description: t('settings.users.toast.roleError.description', 'Could not update the user role'), variant: 'destructive' });
    }
  }, [updateMemberRole, stableRefetch, toast, t]);

  const handleRemoveUser = useCallback(async (memberId: string) => {
    if (confirm(t('settings.users.dialog.confirmRemove', 'Are you sure you want to remove this member?'))) {
      try {
        await removeMember(memberId);
        stableRefetch();
      } catch {
        toast({ title: t('settings.users.toast.removeMemberError.title', 'Error removing member'), description: t('settings.users.toast.removeMemberError.description', 'Could not remove the member'), variant: 'destructive' });
      }
    }
  }, [removeMember, stableRefetch, toast, t]);

  const handleCancelInvitation = useCallback(async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      stableRefetch();
    } catch {
      toast({ title: t('settings.users.toast.cancelInviteError.title', 'Error cancelling invitation'), description: t('settings.users.toast.cancelInviteError.description', 'Could not cancel the invitation'), variant: 'destructive' });
    }
  }, [cancelInvitation, stableRefetch, toast, t]);

  const handleResendInvitation = useCallback(async (invitationId: string) => {
    try {
      await resendInvitation(invitationId);
      stableRefetch();
    } catch {
      toast({ title: t('settings.users.toast.resendInviteError.title', 'Error resending invitation'), description: t('settings.users.toast.resendInviteError.description', 'Could not resend the invitation'), variant: 'destructive' });
    }
  }, [resendInvitation, stableRefetch, toast, t]);

  // Owner row + team members (de-duped against owner email) + pending invitations.
  const allUsers = useMemo<TeamUser[]>(() => {
    const ownerUser: TeamUser | null = baseProfile
      ? {
          id: 'owner',
          user: { full_name: baseProfile.full_name || 'Account Owner', email: baseProfile.email },
          role: 'owner',
          calendar: { name: 'All Calendars' },
          type: 'member',
        }
      : null;

    const teamMembers: TeamUser[] = members
      .filter((member) => member.user?.email !== baseProfile?.email)
      .map((member) => ({ ...member, type: 'member' as const }));

    const pendingInvitations: TeamUser[] = invitations.map((invitation) => ({
      id: invitation.id,
      user: { full_name: invitation.full_name, email: invitation.email },
      role: invitation.role,
      calendar: invitation.calendars ? { name: invitation.calendars.name } : { name: 'Unknown Calendar' },
      type: 'invitation',
      status: invitation.status,
      expires_at: invitation.expires_at,
    }));

    return [...(ownerUser ? [ownerUser] : []), ...teamMembers, ...pendingInvitations];
  }, [baseProfile, members, invitations]);

  const teamLoading = externalLoading !== undefined ? externalLoading : (loading || invitationsLoading);
  const locked = !accessControl.canAccessTeamMembers;

  return (
    <>
      <SetPasswordSection />

      {localProfileData && (
        <ProfileSection
          fullName={localProfileData.full_name || ''}
          email={localProfileData.email || ''}
          phone={localProfileData.phone || ''}
          onChange={updateLocalProfile}
        />
      )}

      <TeamMembersSection
        users={allUsers}
        loading={teamLoading}
        locked={locked}
        canAddMember={calendars.length > 0}
        onAddMember={() => setIsAddUserOpen(true)}
        onUnlock={() => requireAccess('canAccessTeamMembers')}
        onRoleChange={handleRoleChange}
        onRemove={handleRemoveUser}
        onResend={handleResendInvitation}
        onCancelInvite={handleCancelInvitation}
      />

      <AddTeamMemberDialog
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        name={newUserName}
        email={newUserEmail}
        role={newUserRole}
        calendarId={newUserCalendarId}
        calendars={calendars as any}
        submitting={isSubmitting}
        onNameChange={setNewUserName}
        onEmailChange={setNewUserEmail}
        onRoleChange={setNewUserRole}
        onCalendarChange={setNewUserCalendarId}
        onSubmit={handleAddUser}
      />

      <SettingsSaveBar
        dirty={hasUnsavedChanges}
        saving={isSaving}
        justSaved={justSaved}
        onSave={saveAllChanges}
        onDiscard={discardChanges}
      />
    </>
  );
};
