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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import PhoneInput from 'react-phone-number-input';
import { parsePhoneNumber, isValidPhoneNumber } from 'react-phone-number-input';
import './phone-input.css';
import { COMPREHENSIVE_TIMEZONES } from '@/components/availability/TimezoneData';
import { SearchableSelect } from './SearchableSelect';
import { CountryPhoneInput } from './CountryPhoneInput';
import { EnhancedDatePicker } from './EnhancedDatePicker';
import { businessTypes } from '@/constants/settingsOptions';
import ReactSelect from 'react-select';
import { SetPasswordSection } from './SetPasswordSection';


// Enhanced language options - alphabetically sorted with more languages
const LANGUAGE_OPTIONS = [
  { value: 'ar', label: '🇸🇦 العربية (Arabic)' },
  { value: 'bg', label: '🇧🇬 Български (Bulgarian)' },
  { value: 'ca', label: '🇪🇸 Català (Catalan)' },
  { value: 'cs', label: '🇨🇿 Čeština (Czech)' },
  { value: 'da', label: '🇩🇰 Dansk (Danish)' },
  { value: 'de', label: '🇩🇪 Deutsch (German)' },
  { value: 'el', label: '🇬🇷 Ελληνικά (Greek)' },
  { value: 'en', label: '🇺🇸 English' },
  { value: 'es', label: '🇪🇸 Español (Spanish)' },
  { value: 'et', label: '🇪🇪 Eesti (Estonian)' },
  { value: 'fi', label: '🇫🇮 Suomi (Finnish)' },
  { value: 'fr', label: '🇫🇷 Français (French)' },
  { value: 'he', label: '🇮🇱 עברית (Hebrew)' },
  { value: 'hi', label: '🇮🇳 हिन्दी (Hindi)' },
  { value: 'hr', label: '🇭🇷 Hrvatski (Croatian)' },
  { value: 'hu', label: '🇭🇺 Magyar (Hungarian)' },
  { value: 'id', label: '🇮🇩 Bahasa Indonesia (Indonesian)' },
  { value: 'it', label: '🇮🇹 Italiano (Italian)' },
  { value: 'ja', label: '🇯🇵 日本語 (Japanese)' },
  { value: 'ko', label: '🇰🇷 한국어 (Korean)' },
  { value: 'lt', label: '🇱🇹 Lietuvių (Lithuanian)' },
  { value: 'lv', label: '🇱🇻 Latviešu (Latvian)' },
  { value: 'ms', label: '🇲🇾 Bahasa Melayu (Malay)' },
  { value: 'nl', label: '🇳🇱 Nederlands (Dutch)' },
  { value: 'no', label: '🇳🇴 Norsk (Norwegian)' },
  { value: 'pl', label: '🇵🇱 Polski (Polish)' },
  { value: 'pt', label: '🇵🇹 Português (Portuguese)' },
  { value: 'ro', label: '🇷🇴 Română (Romanian)' },
  { value: 'ru', label: '🇷🇺 Русский (Russian)' },
  { value: 'sk', label: '🇸🇰 Slovenčina (Slovak)' },
  { value: 'sl', label: '🇸🇮 Slovenščina (Slovenian)' },
  { value: 'sv', label: '🇸🇪 Svenska (Swedish)' },
  { value: 'th', label: '🇹🇭 ไทย (Thai)' },
  { value: 'tr', label: '🇹🇷 Türkçe (Turkish)' },
  { value: 'uk', label: '🇺🇦 Українська (Ukrainian)' },
  { value: 'vi', label: '🇻🇳 Tiếng Việt (Vietnamese)' },
  { value: 'zh', label: '🇨🇳 中文 (Chinese)' },
];

// Convert comprehensive timezones to searchable format
const TIMEZONE_OPTIONS = COMPREHENSIVE_TIMEZONES.map(tz => ({
  value: tz.value,
  label: tz.label,
  searchText: `${tz.label} UTC${tz.offset >= 0 ? '+' : ''}${tz.offset}`
}));

interface UserManagementProps {
  externalBusinessData?: any;
  externalProfileData?: any;
  onBusinessDataChange?: (data: any) => void;
  onProfileDataChange?: (data: any) => void;
  onUpdateBusiness?: () => void;
  onUpdateProfile?: () => void;
  externalLoading?: boolean;
}

export const UserManagement = ({
  externalBusinessData,
  externalProfileData,
  onBusinessDataChange,
  onProfileDataChange,
  onUpdateBusiness,
  onUpdateProfile,
  externalLoading
}: UserManagementProps = {}) => {
  const { calendars } = useCalendarContext();
  const { members, loading, inviteMember, removeMember, updateMemberRole, refetch } = useCalendarMembers();
  const { invitations, loading: invitationsLoading, cancelInvitation, resendInvitation, refetch: refetchInvitations } = useTeamInvitations();
  const { profileData, businessData, handleBatchUpdate, refetch: refetchSettings } = useSettingsContext();
  const { toast } = useToast();
  const { accessControl, requireAccess } = useAccessControl();
  
  // Add User Modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor' | 'viewer'>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local state for buffered profile changes (no auto-save)
  const [localProfileData, setLocalProfileData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProfileInitialized, setIsProfileInitialized] = useState(false);

  // Use external data if provided, otherwise use context data
  const baseProfile = externalProfileData || profileData;
  const currentBusinessData = externalBusinessData || businessData;
  const isUsingExternalData = !!externalBusinessData;

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
    
    const fieldsToCompare = ['full_name', 'email', 'phone', 'date_of_birth', 'language', 'timezone'];
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

  // Save all profile changes
  const saveAllChanges = async () => {
    if (!localProfileData) return;
    
    setIsSaving(true);
    try {
      const success = await handleBatchUpdate(localProfileData, currentBusinessData);
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

    setIsSubmitting(true);
    try {
      await inviteMember(
        newUserEmail, 
        defaultCalendar.id, 
        newUserRole, 
        newUserName
      );
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('viewer');
      setIsAddUserOpen(false);
      toast({
        title: "User invited",
        description: "User has been added successfully",
      });
      stableRefetch();
    } catch (error) {
      toast({
        title: "Error adding user",
        description: "Could not add the user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [newUserEmail, newUserName, newUserRole, calendars, inviteMember, toast, stableRefetch]);

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
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'editor':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
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
            <Badge variant="outline" className="text-yellow-400 border-yellow-600 bg-yellow-900/20">
              <Clock className="h-3 w-3 mr-1" />
              Invited
            </Badge>
          );
        case 'expired':
          return (
            <Badge variant="outline" className="text-red-400 border-red-600 bg-red-900/20">
              <X className="h-3 w-3 mr-1" />
              Expired
            </Badge>
          );
        case 'cancelled':
          return (
            <Badge variant="outline" className="text-gray-400 border-gray-600 bg-gray-900/20">
              <X className="h-3 w-3 mr-1" />
              Cancelled
            </Badge>
          );
        default:
          return null;
      }
    }
    return (
      <Badge variant="outline" className="text-green-400 border-green-600 bg-green-900/20">
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
    <Card className="border-gray-700 bg-gray-800">
      <CardHeader>
        <div>
          <CardTitle className="text-white">Users & Team Management</CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            Manage your profile and team access
          </p>
        </div>
      </CardHeader>

      <CardContent>
        {currentLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="bg-gray-900 mb-6">
              <TabsTrigger value="profile" className="data-[state=active]:bg-gray-700">Your Profile</TabsTrigger>
              <TabsTrigger 
                value="team" 
                className="data-[state=active]:bg-gray-700 flex items-center gap-2"
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
                    <span className="text-xs bg-orange-500 text-white px-1 rounded ml-1">Pro</span>
                  </>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              {/* Set Password Section for Google-only accounts */}
              <SetPasswordSection />
              
              {localProfileData && (
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Full Name</Label>
                      <Input
                        value={localProfileData.full_name || ''}
                        onChange={(e) => updateLocalProfile('full_name', e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Enter your full name"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Email</Label>
                      <Input
                        type="email"
                        value={localProfileData.email || ''}
                        onChange={(e) => updateLocalProfile('email', e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Enter your email"
                      />
                    </div>

                    {/* Phone Number with Country Code */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</Label>
                      <CountryPhoneInput
                        value={localProfileData.phone || ''}
                        onChange={(value) => updateLocalProfile('phone', value)}
                      />
                    </div>

                    {/* Date of Birth with Year Selector */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Date of Birth</Label>
                      <EnhancedDatePicker
                        value={localProfileData.date_of_birth ? new Date(localProfileData.date_of_birth) : undefined}
                        onChange={(date) => {
                          if (date) {
                            updateLocalProfile('date_of_birth', format(date, 'yyyy-MM-dd'));
                          }
                        }}
                        placeholder="Select your date of birth"
                      />
                    </div>

                    {/* Language */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Language</Label>
                      <SearchableSelect
                        value={localProfileData.language || 'nl'}
                        onValueChange={(value) => updateLocalProfile('language', value)}
                        options={LANGUAGE_OPTIONS}
                        placeholder="Select language"
                        searchPlaceholder="Search languages..."
                      />
                    </div>

                    {/* Timezone */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Timezone</Label>
                      <SearchableSelect
                        value={localProfileData.timezone || 'Europe/Amsterdam'}
                        onValueChange={(value) => updateLocalProfile('timezone', value)}
                        options={TIMEZONE_OPTIONS}
                        placeholder="Select timezone"
                        searchPlaceholder="Search timezones..."
                      />
                    </div>
                  </div>

                </div>
              )}
            </TabsContent>

            {/* Fixed Save Bar at bottom of screen */}
            {hasUnsavedChanges && (
              <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-50 shadow-lg">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                  <span className="text-amber-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    You have unsaved changes
                  </span>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={discardChanges}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Discard
                    </Button>
                    <Button 
                      onClick={saveAllChanges} 
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700"
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
                    <h3 className="text-lg font-medium text-white">Team Members</h3>
                    <p className="text-sm text-gray-400">Manage your team access and permissions</p>
                  </div>
                  <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        disabled={calendars.length === 0}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Team Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">Add New Team Member</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-300">Full Name</Label>
                          <Input
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="John Doe"
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300">Email Address</Label>
                          <Input
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="bg-gray-900 border-gray-700 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300">Role</Label>
                          <Select value={newUserRole} onValueChange={(value: 'editor' | 'viewer') => setNewUserRole(value)}>
                            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="viewer">Viewer - Can only view bookings</SelectItem>
                              <SelectItem value="editor">Editor - Can manage bookings and settings</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsAddUserOpen(false)}
                            className="border-gray-700 text-gray-300 hover:bg-gray-700"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddUser}
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isSubmitting ? 'Adding...' : 'Add Team Member'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Role</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Calendar</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.length > 0 ? (
                        allUsers.map((user) => (
                          <TableRow key={user.id} className="border-gray-700">
                            <TableCell>
                              <div>
                                <p className="text-white font-medium">
                                  {user.user?.full_name || 'Unknown User'}
                                </p>
                                <p className="text-sm text-gray-400">{user.user?.email}</p>
                                {user.type === 'invitation' && user.status === 'pending' && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Expires: {new Date(user.expires_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getRoleIcon(user.role)}
                                <span className="text-gray-300">{getRoleName(user.role)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(user)}
                            </TableCell>
                            <TableCell>
                              {user.role === 'owner' ? (
                                <Badge variant="secondary" className="bg-yellow-900/30 text-yellow-400 border-yellow-700">
                                  All Calendars
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-300 border-gray-600">
                                  {user.calendar?.name || 'Unknown Calendar'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.role === 'owner' ? (
                                <Badge variant="secondary" className="bg-blue-900/30 text-blue-400 border-blue-700">
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
                                        className="h-8 px-2 border-blue-700 text-blue-400 hover:bg-blue-900/30"
                                        title="Resend invitation"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCancelInvitation(user.id)}
                                        className="h-8 px-2 border-red-700 text-red-400 hover:bg-red-900/30"
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
                                      className="h-8 px-2 border-blue-700 text-blue-400 hover:bg-blue-900/30"
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
                                    <SelectTrigger className="h-8 w-24 bg-gray-800 border-gray-700 text-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700">
                                      <SelectItem value="viewer">Viewer</SelectItem>
                                      <SelectItem value="editor">Editor</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveUser(user.id)}
                                    className="h-8 px-2 border-red-700 text-red-400 hover:bg-red-900/30"
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
                          <TableCell colSpan={5} className="text-center py-8 text-gray-400">
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
