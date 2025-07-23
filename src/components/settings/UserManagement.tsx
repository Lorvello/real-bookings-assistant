import React, { useState, useEffect } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useCalendarMembers } from '@/hooks/useCalendarMembers';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Crown, User, Eye, Lock, Check, X, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccessControl } from '@/hooks/useAccessControl';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Common timezone options
const TIMEZONE_OPTIONS = [
  { value: 'Europe/Amsterdam', label: 'Amsterdam (GMT+1)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Berlin', label: 'Berlin (GMT+1)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'Europe/Rome', label: 'Rome (GMT+1)' },
  { value: 'Europe/Brussels', label: 'Brussels (GMT+1)' },
  { value: 'Europe/Vienna', label: 'Vienna (GMT+1)' },
  { value: 'Europe/Zurich', label: 'Zurich (GMT+1)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'America/Chicago', label: 'Chicago (GMT-6)' },
  { value: 'America/Toronto', label: 'Toronto (GMT-5)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (GMT+8)' },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+10)' },
];

const LANGUAGE_OPTIONS = [
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'ar', label: 'العربية' },
];

export const UserManagement = () => {
  const { calendars } = useCalendarContext();
  const { members, loading, inviteMember, removeMember, updateMemberRole, refetch } = useCalendarMembers();
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  const { accessControl, requireAccess } = useAccessControl();
  
  // Add User Modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor' | 'viewer'>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<any>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Handle adding a new user (simplified - no calendar selection)
  const handleAddUser = async () => {
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
      // Force refresh members list
      await refetch();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'editor' | 'viewer') => {
    await updateMemberRole(memberId, newRole);
    // Force refresh members list
    await refetch();
  };

  const handleRemoveUser = async (memberId: string) => {
    if (confirm('Are you sure you want to remove this user?')) {
      await removeMember(memberId);
      // Force refresh members list
      await refetch();
    }
  };

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

  // Auto-refresh members when component mounts or when a member is added
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        refetch();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [loading, refetch]);

  // Profile editing functions
  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setTempValues({ [field]: currentValue });
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValues({});
  };

  const saveField = async (field: string) => {
    setSaving(field);
    try {
      await updateProfile({ [field]: tempValues[field] });
      setEditingField(null);
      setTempValues({});
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: "Could not update your profile",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Auto-save for certain fields
  const handleAutoSave = async (field: string, value: any) => {
    setSaving(field);
    try {
      await updateProfile({ [field]: value });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: "Could not update your profile",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Combine users without duplications
  // Ensure owner is only included once at the top
  const ownerUser = profile ? {
    id: 'owner',
    user: {
      full_name: profile.full_name || 'Account Owner',
      email: profile.email
    },
    role: 'owner',
    calendar: { name: 'All Calendars' }
  } : null;

  // Filter out any team members who have the same email as the owner
  const teamMembers = members.filter(
    member => member.user?.email !== profile?.email
  );

  // Combine owner and team members
  const allUsers = [
    ...(ownerUser ? [ownerUser] : []),
    ...teamMembers
  ];

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
        {(loading || profileLoading) ? (
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
                {!accessControl.canAccessTeamMembers && <Lock className="h-3 w-3" />}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              {profile && (
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Full Name</Label>
                      {editingField === 'full_name' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={tempValues.full_name || ''}
                            onChange={(e) => setTempValues({ ...tempValues, full_name: e.target.value })}
                            className="bg-gray-800 border-gray-700 text-white"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => saveField('full_name')}
                            disabled={saving === 'full_name'}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            className="border-gray-700 text-gray-300 hover:bg-gray-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="text-white bg-gray-800 border border-gray-700 rounded-md p-3 cursor-pointer hover:bg-gray-700 transition-colors"
                          onClick={() => startEditing('full_name', profile.full_name || '')}
                        >
                          {profile.full_name || 'Click to edit'}
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Email</Label>
                      {editingField === 'email' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="email"
                            value={tempValues.email || ''}
                            onChange={(e) => setTempValues({ ...tempValues, email: e.target.value })}
                            className="bg-gray-800 border-gray-700 text-white"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => saveField('email')}
                            disabled={saving === 'email'}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            className="border-gray-700 text-gray-300 hover:bg-gray-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="text-white bg-gray-800 border border-gray-700 rounded-md p-3 cursor-pointer hover:bg-gray-700 transition-colors"
                          onClick={() => startEditing('email', profile.email || '')}
                        >
                          {profile.email}
                        </div>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</Label>
                      {editingField === 'phone' ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="tel"
                            value={tempValues.phone || ''}
                            onChange={(e) => setTempValues({ ...tempValues, phone: e.target.value })}
                            className="bg-gray-800 border-gray-700 text-white"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => saveField('phone')}
                            disabled={saving === 'phone'}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            className="border-gray-700 text-gray-300 hover:bg-gray-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="text-white bg-gray-800 border border-gray-700 rounded-md p-3 cursor-pointer hover:bg-gray-700 transition-colors"
                          onClick={() => startEditing('phone', profile.phone || '')}
                        >
                          {profile.phone || 'Click to add'}
                        </div>
                      )}
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Date of Birth</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-gray-800 border-gray-700 text-white hover:bg-gray-700",
                              !profile.date_of_birth && "text-gray-400"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {profile.date_of_birth ? format(new Date(profile.date_of_birth), "PPP") : "Click to select"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700" align="start">
                          <Calendar
                            mode="single"
                            selected={profile.date_of_birth ? new Date(profile.date_of_birth) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                handleAutoSave('date_of_birth', format(date, 'yyyy-MM-dd'));
                              }
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            className="p-3 pointer-events-auto bg-gray-800"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Language */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Language</Label>
                      <Select
                        value={profile.language || 'nl'}
                        onValueChange={(value) => handleAutoSave('language', value)}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {LANGUAGE_OPTIONS.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Timezone */}
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Timezone</Label>
                      <Select
                        value={profile.timezone || 'Europe/Amsterdam'}
                        onValueChange={(value) => handleAutoSave('timezone', value)}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {TIMEZONE_OPTIONS.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

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
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getRoleIcon(user.role)}
                                <span className="text-gray-300">{getRoleName(user.role)}</span>
                              </div>
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
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Select
                                    value={user.role}
                                    onValueChange={(value: 'editor' | 'viewer') => handleRoleChange(user.id, value)}
                                  >
                                    <SelectTrigger className="w-24 h-8 bg-gray-800 border-gray-700 text-white text-xs">
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
                          <TableCell colSpan={4} className="text-center py-6 text-gray-400">
                            No team members found. Add team members to collaborate.
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