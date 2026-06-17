import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useCalendarMembers } from '@/hooks/useCalendarMembers';
import { useTeamInvitations } from '@/hooks/useTeamInvitations';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Crown, User, Eye, Lock, Check, X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Mail, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccessControl } from '@/hooks/useAccessControl';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import PhoneInput from 'react-phone-number-input';
import { parsePhoneNumber, isValidPhoneNumber } from 'react-phone-number-input';
import './phone-input.css';
import { CountryPhoneInput } from './CountryPhoneInput';
import { businessTypes } from '@/constants/settingsOptions';
import ReactSelect from 'react-select';
import { SetPasswordSection } from './SetPasswordSection';

// NOTE: LANGUAGE_OPTIONS / TIMEZONE_OPTIONS (and the SearchableSelect +
// COMPREHENSIVE_TIMEZONES imports) were removed together with the dead
// Language/Timezone profile selects. They had no consumer anywhere in the app.

interface UserManagementProps {
  externalBusinessData?: any;
  externalProfileData?: any;
  externalLoading?: boolean;
}

export const UserManagement = ({
  externalBusinessData,
  externalProfileData,
  externalLoading
}: UserManagementProps = {}) => {
  const { calendars } = useCalendarContext();
  const { members, loading, inviteMember, removeMember, updateMemberRole, refetch } = useCalendarMembers();
  const { invitations, loading: invitationsLoading, cancelInvitation, resendInvitation, refetch: refetchInvitations } = useTeamInvitations();
  const { profileData, saveFields, refetch: refetchSettings } = useSettingsContext();
  const { toast } = useToast();
  const { accessControl, requireAccess } = useAccessControl();
  
  // Add User Modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor' | 'viewer'>('viewer');
  // Which calendar the invited member joins. Empty = fall back to the default
  // calendar in handleAddUser. Previously the invite silently always used the
  // default calendar with no way to choose, which was confusing for owners with
  // multiple calendars (the table shows a Calendar column they couldn't control).
  const [newUserCalendarId, setNewUserCalendarId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local state for buffered profile changes (no auto-save)
  const [localProfileData, setLocalProfileData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProfileInitialized, setIsProfileInitialized] = useState(false);

  // Use external data if provided, otherwise use context data
  const baseProfile = externalProfileData || profileData;

  // Sync local state when REAL server data is loaded (has id)
  useEffect(() => {
    if (baseProfile?.id) {
      setLocalProfileData(baseProfile);
      setIsProfileInitialized(true);
    }
  }, [baseProfile?.id]);

  // Check if there are unsaved changes - only after initialized
  const hasUnsavedChanges = useMemo(() => {
    if (!isProfileInitialized) return false;
    if (!localProfileData || !baseProfile) return false;
    
    // email is read-only; language/timezone/date_of_birth controls were removed ->
    // none of those change via the UI, so only compare the editable fields.
    const fieldsToCompare = ['full_name', 'phone'];
    return fieldsToCompare.some(field => {
      const localVal = localProfileData[field] || '';
      const baseVal = baseProfile[field] || '';
      return localVal !== baseVal;
    });
  }, [isProfileInitialized, localProfileData, baseProfile]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // The profile fields this tab owns. PARTIAL save: only these are written, so the
  // Profile tab can never clobber the AI-Knowledge tab's business/social fields.
  const PROFILE_FIELDS = ['full_name', 'phone'];

  // Save all profile changes
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
        toast({
          title: "Changes Saved",
          description: "Your profile has been updated successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Discard all changes
  const discardChanges = () => {
    setLocalProfileData(baseProfile);
  };

  // Update local profile field (no auto-save, just local state)
  const updateLocalProfile = useCallback((field: string, value: any) => {
    setLocalProfileData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  // Stabilize refetch function
  const stableRefetch = useCallback(() => {
    if (!loading && !invitationsLoading) {
      refetch();
      refetchInvitations();
    }
  }, [refetch, refetchInvitations, loading, invitationsLoading]);

  // Handle adding a new user (simplified - no calendar selection)
  const handleAddUser = useCallback(async () => {
    if (!newUserEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    // Get the default calendar if available
    const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
    if (!defaultCalendar) {
      toast({
        title: "No calendar available",
        description: "You need to have at least one calendar to add users",
        variant: "destructive",
      });
      return;
    }
    // Honor the calendar picked in the dialog; fall back to the default calendar.
    const targetCalendarId = newUserCalendarId || defaultCalendar.id;

    setIsSubmitting(true);
    try {
      // inviteMember owns its own success/error toasts (incl. the specific reason,
      // e.g. team-member limit reached). Only clear + close the form when the invite
      // actually succeeded — previously this always showed "User invited" even when
      // the invite failed.
      const ok = await inviteMember(
        newUserEmail,
        targetCalendarId,
        newUserRole,
        newUserName
      );
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
  }, [newUserEmail, newUserName, newUserRole, newUserCalendarId, calendars, inviteMember, stableRefetch, toast]);

  const handleRoleChange = useCallback(async (memberId: string, newRole: 'editor' | 'viewer') => {
    try {
      await updateMemberRole(memberId, newRole);
      stableRefetch();
    } catch (error) {
      toast({
        title: "Error updating role",
        description: "Could not update the user role",
        variant: "destructive",
      });
    }
  }, [updateMemberRole, stableRefetch, toast]);

  const handleRemoveUser = useCallback(async (memberId: string) => {
    if (confirm('Are you sure you want to remove this user?')) {
      try {
        await removeMember(memberId);
        stableRefetch();
      } catch (error) {
        toast({
          title: "Error removing user",
          description: "Could not remove the user",
          variant: "destructive",
        });
      }
    }
  }, [removeMember, stableRefetch, toast]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-gold-foreground" />;
      case 'editor':
        return <User className="h-4 w-4 text-accent-foreground" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-muted-foreground" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      default:
        return 'Unknown';
    }
  };

  const getStatusBadge = (user: any) => {
    if (user.type === 'invitation') {
      switch (user.status) {
        case 'pending':
          return (
            <Badge variant="outline" className="text-warning-foreground border-warning/40 bg-warning/10">
              <Clock className="h-3 w-3 mr-1" />
              Invited
            </Badge>
          );
        case 'expired':
          return (
            <Badge variant="outline" className="text-destructive-foreground border-destructive/40 bg-destructive/10">
              <X className="h-3 w-3 mr-1" />
              Expired
            </Badge>
          );
        case 'cancelled':
          return (
            <Badge variant="outline" className="text-muted-foreground border-border bg-background/20">
              <X className="h-3 w-3 mr-1" />
              Cancelled
            </Badge>
          );
        default:
          return null;
      }
    }
    return (
      <Badge variant="outline" className="text-success-foreground border-success/40 bg-success/10">
        <Check className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };

  const handleCancelInvitation = useCallback(async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      stableRefetch();
    } catch (error) {
      toast({
        title: "Error cancelling invitation",
        description: "Could not cancel the invitation",
        variant: "destructive",
      });
    }
  }, [cancelInvitation, stableRefetch, toast]);

  const handleResendInvitation = useCallback(async (invitationId: string) => {
    try {
      await resendInvitation(invitationId);
      stableRefetch();
    } catch (error) {
      toast({
        title: "Error resending invitation",
        description: "Could not resend the invitation",
        variant: "destructive",
      });
    }
  }, [resendInvitation, stableRefetch, toast]);

  const currentLoading = externalLoading !== undefined ? externalLoading : (loading || invitationsLoading);

  // Memoize computed users to prevent unnecessary recalculations
  const allUsers = useMemo(() => {
    // Ensure owner is only included once at the top
    const ownerUser = baseProfile ? {
      id: 'owner',
      user: {
        full_name: baseProfile.full_name || 'Account Owner',
        email: baseProfile.email
      },
      role: 'owner',
      calendar: { name: 'All Calendars' },
      type: 'member' as const
    } : null;

    // Filter out any team members who have the same email as the owner
    const teamMembers = members.filter(
      member => member.user?.email !== baseProfile?.email
    ).map(member => ({
      ...member,
      type: 'member' as const
    }));

    // Add pending invitations
    const pendingInvitations = invitations.map(invitation => ({
      id: invitation.id,
      user: {
        full_name: invitation.full_name,
        email: invitation.email
      },
      role: invitation.role,
      calendar: invitation.calendars ? { name: invitation.calendars.name } : { name: 'Unknown Calendar' },
      type: 'invitation' as const,
      status: invitation.status,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at
    }));

    // Combine owner, team members, and pending invitations
    return [
      ...(ownerUser ? [ownerUser] : []),
      ...teamMembers,
      ...pendingInvitations
    ];
  }, [baseProfile, members, invitations]);

  // Format phone number to E.164 format for validation
  const formatPhoneForInput = useCallback((phone: string | null | undefined) => {
    if (!phone) return undefined;
    
    try {
      // If the phone is already in E.164 format, return it
      if (phone.startsWith('+') && isValidPhoneNumber(phone)) {
        return phone;
      }
      
      // Try to parse and format the phone number
      const parsed = parsePhoneNumber(phone, 'NL'); // Default to NL country code
      if (parsed && parsed.isValid()) {
        return parsed.number;
      }
      
      // If parsing fails, return undefined to avoid validation errors
      return undefined;
    } catch (error) {
      console.warn('Phone number formatting error:', error);
      return undefined;
    }
  }, []);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div>
          <CardTitle className="text-foreground">Users & Team Management</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile and team access
          </p>
        </div>
      </CardHeader>

      <CardContent>
        {currentLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="bg-background mb-6">
              <TabsTrigger value="profile" className="data-[state=active]:bg-muted">Your Profile</TabsTrigger>
              <TabsTrigger 
                value="team" 
                className="data-[state=active]:bg-muted flex items-center gap-2"
                disabled={!accessControl.canAccessTeamMembers}
                onClick={(e) => {
                  if (!accessControl.canAccessTeamMembers) {
                    e.preventDefault();
                    requireAccess('canAccessTeamMembers');
                  }
                }}
              >
                Team Members
                {!accessControl.canAccessTeamMembers && (
                  <>
                    <Lock className="h-3 w-3" />
                    <span className="text-xs bg-gold/15 text-gold-foreground px-1 rounded ml-1">Pro</span>
                  </>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              {/* Set Password Section for Google-only accounts */}
              <SetPasswordSection />
              
              {localProfileData && (
                <div className="bg-background rounded-lg p-6 border border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div>
                      <Label className="block text-sm font-medium text-foreground mb-2">Full Name</Label>
                      <Input
                        value={localProfileData.full_name || ''}
                        onChange={(e) => updateLocalProfile('full_name', e.target.value)}
                        className="bg-card border-border text-foreground"
                        placeholder="Enter your full name"
                      />
                    </div>

                    {/* Email — read-only. This is the LOGIN email (auth.users.email).
                        The old editable field only wrote public.users.email and never
                        touched Supabase Auth, so the displayed email and the actual
                        login could silently diverge. Until a proper verified
                        email-change flow (auth.updateUser + confirmation) is built, we
                        show the real login email read-only so it can never lie. */}
                    <div>
                      <Label className="block text-sm font-medium text-foreground mb-2">Email</Label>
                      <Input
                        type="email"
                        value={localProfileData.email || ''}
                        readOnly
                        disabled
                        className="bg-card/60 border-border text-muted-foreground cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        This is your login email. To change it, contact support.
                      </p>
                    </div>

                    {/* Phone Number with Country Code */}
                    <div>
                      <Label className="block text-sm font-medium text-foreground mb-2">Phone Number</Label>
                      <CountryPhoneInput
                        value={localProfileData.phone || ''}
                        onChange={(value) => updateLocalProfile('phone', value)}
                      />
                    </div>

                    {/* NOTE: Date of Birth was removed. It had no consumer anywhere
                        (no agent / Stripe / booking / analytics read it) and is
                        personal data we should not collect (GDPR data-minimization).
                        It is also no longer written in the save payload.

                        The Language and Timezone selects were removed earlier.
                        Neither had a consumer: users.language is read nowhere, and the
                        WhatsApp agent reads calendars.timezone (per-calendar), never
                        users.timezone. They presented as working controls but changed
                        nothing, which is misleading. Re-add only when a real consumer exists. */}
                  </div>

                </div>
              )}
            </TabsContent>

            {/* Fixed Save Bar at bottom of screen */}
            {hasUnsavedChanges && (
              <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50 shadow-lg">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                  <span className="text-amber-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    You have unsaved changes
                  </span>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={discardChanges}
                      className="border-border text-foreground hover:bg-muted"
                    >
                      Discard
                    </Button>
                    <Button 
                      onClick={saveAllChanges} 
                      disabled={isSaving}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <TabsContent value="team">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">Team Members</h3>
                    <p className="text-sm text-muted-foreground">Manage your team access and permissions</p>
                  </div>
                  <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-primary hover:bg-primary/90"
                        disabled={calendars.length === 0}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Team Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Add New Team Member</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-foreground">Full Name</Label>
                          <Input
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="John Doe"
                            className="bg-background border-border text-foreground"
                          />
                        </div>
                        <div>
                          <Label className="text-foreground">Email Address</Label>
                          <Input
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="bg-background border-border text-foreground"
                          />
                        </div>
                        <div>
                          <Label className="text-foreground">Calendar</Label>
                          <Select
                            value={newUserCalendarId || (calendars.find(cal => cal.is_default) || calendars[0])?.id || ''}
                            onValueChange={(value) => setNewUserCalendarId(value)}
                          >
                            <SelectTrigger className="bg-background border-border text-foreground">
                              <SelectValue placeholder="Select a calendar" />
                            </SelectTrigger>
                            <SelectContent className="glass">
                              {calendars.map((cal) => (
                                <SelectItem key={cal.id} value={cal.id}>{cal.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-foreground">Role</Label>
                          <Select value={newUserRole} onValueChange={(value: 'editor' | 'viewer') => setNewUserRole(value)}>
                            <SelectTrigger className="bg-background border-border text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass">
                              <SelectItem value="viewer">Viewer - Can only view bookings</SelectItem>
                              <SelectItem value="editor">Editor - Can manage bookings and settings</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsAddUserOpen(false)}
                            className="border-border text-foreground hover:bg-muted"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddUser}
                            disabled={isSubmitting}
                            className="bg-primary hover:bg-primary/90"
                          >
                            {isSubmitting ? 'Adding...' : 'Add Team Member'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="bg-background rounded-lg overflow-hidden border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">User</TableHead>
                        <TableHead className="text-foreground">Role</TableHead>
                        <TableHead className="text-foreground">Status</TableHead>
                        <TableHead className="text-foreground">Calendar</TableHead>
                        <TableHead className="text-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.length > 0 ? (
                        allUsers.map((user) => (
                          <TableRow key={user.id} className="border-border">
                            <TableCell>
                              <div>
                                <p className="text-foreground font-medium">
                                  {user.user?.full_name || 'Unknown User'}
                                </p>
                                <p className="text-sm text-muted-foreground">{user.user?.email}</p>
                                {user.type === 'invitation' && user.status === 'pending' && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Expires: {new Date(user.expires_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getRoleIcon(user.role)}
                                <span className="text-foreground">{getRoleName(user.role)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(user)}
                            </TableCell>
                            <TableCell>
                              {user.role === 'owner' ? (
                                <Badge variant="secondary" className="bg-warning/10 text-warning-foreground border-warning/30">
                                  All Calendars
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-foreground border-border">
                                  {user.calendar?.name || 'Unknown Calendar'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.role === 'owner' ? (
                                <Badge variant="secondary" className="bg-primary/10 text-accent-foreground border-primary/20">
                                  Owner
                                </Badge>
                              ) : user.type === 'invitation' ? (
                                <div className="flex items-center space-x-2">
                                  {user.status === 'pending' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleResendInvitation(user.id)}
                                        className="h-8 px-2 border-primary/20 text-accent-foreground hover:bg-primary/10"
                                        title="Resend invitation"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCancelInvitation(user.id)}
                                        className="h-8 px-2 border-destructive/40 text-destructive-foreground hover:bg-destructive/10"
                                        title="Cancel invitation"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                  {user.status === 'expired' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleResendInvitation(user.id)}
                                      className="h-8 px-2 border-primary/20 text-accent-foreground hover:bg-primary/10"
                                      title="Resend invitation"
                                    >
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Resend
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Select 
                                    value={user.role} 
                                    onValueChange={(value: 'editor' | 'viewer') => handleRoleChange(user.id, value)}
                                  >
                                    <SelectTrigger className="h-8 w-24 bg-card border-border text-foreground">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="glass">
                                      <SelectItem value="viewer">Viewer</SelectItem>
                                      <SelectItem value="editor">Editor</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveUser(user.id)}
                                    className="h-8 px-2 border-destructive/40 text-destructive-foreground hover:bg-destructive/10"
                                    title="Remove user"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No team members yet. Add your first team member to get started.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
