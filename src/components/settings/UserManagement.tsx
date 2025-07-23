
import React, { useState } from 'react';
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
import { UserPlus, Edit, Trash2, Crown, User, Eye, Save, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccessControl } from '@/hooks/useAccessControl';

export const UserManagement = () => {
  const { calendars } = useCalendarContext();
  const { members, loading, inviteMember, removeMember, updateMemberRole } = useCalendarMembers();
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  const { accessControl, requireAccess } = useAccessControl();
  
  // Add User Modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor' | 'viewer'>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit User Modal state
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    language: 'nl',
    timezone: 'Europe/Amsterdam',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Initialize edit profile data when dialog opens
  const openEditUserDialog = () => {
    if (profile) {
      setEditProfileData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        date_of_birth: profile.date_of_birth || '',
        language: profile.language || 'nl',
        timezone: profile.timezone || 'Europe/Amsterdam',
      });
    }
    setIsEditUserOpen(true);
  };

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
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updating the owner's profile information
  const handleUpdateProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updateProfile(editProfileData);
      setIsEditUserOpen(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'editor' | 'viewer') => {
    await updateMemberRole(memberId, newRole);
  };

  const handleRemoveUser = async (memberId: string) => {
    if (confirm('Are you sure you want to remove this user?')) {
      await removeMember(memberId);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'editor':
        return <Edit className="h-4 w-4 text-blue-500" />;
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
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Full Name</Label>
                      <div className="text-white bg-gray-800 border border-gray-700 rounded-md p-3">
                        {profile.full_name || 'Not set'}
                      </div>
                    </div>
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Email</Label>
                      <div className="text-white bg-gray-800 border border-gray-700 rounded-md p-3">
                        {profile.email}
                      </div>
                    </div>
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</Label>
                      <div className="text-white bg-gray-800 border border-gray-700 rounded-md p-3">
                        {profile.phone || 'Not set'}
                      </div>
                    </div>
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Date of Birth</Label>
                      <div className="text-white bg-gray-800 border border-gray-700 rounded-md p-3">
                        {profile.date_of_birth || 'Not set'}
                      </div>
                    </div>
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Language</Label>
                      <div className="text-white bg-gray-800 border border-gray-700 rounded-md p-3">
                        {profile.language === 'nl' ? 'Dutch' : 
                         profile.language === 'en' ? 'English' :
                         profile.language === 'de' ? 'German' :
                         profile.language === 'fr' ? 'French' :
                         profile.language === 'es' ? 'Spanish' :
                         profile.language === 'tr' ? 'Turkish' :
                         profile.language === 'ar' ? 'Arabic' :
                         profile.language || 'Not set'}
                      </div>
                    </div>
                    <div>
                      <Label className="block text-sm font-medium text-gray-300 mb-2">Timezone</Label>
                      <div className="text-white bg-gray-800 border border-gray-700 rounded-md p-3">
                        {profile.timezone || 'Not set'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={openEditUserDialog}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
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

      {/* Edit Profile Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Full Name</Label>
              <Input
                value={editProfileData.full_name}
                onChange={(e) => setEditProfileData({...editProfileData, full_name: e.target.value})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input
                type="email"
                value={editProfileData.email}
                onChange={(e) => setEditProfileData({...editProfileData, email: e.target.value})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Phone Number</Label>
              <Input
                type="tel"
                value={editProfileData.phone}
                onChange={(e) => setEditProfileData({...editProfileData, phone: e.target.value})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Date of Birth</Label>
              <Input
                type="date"
                value={editProfileData.date_of_birth}
                onChange={(e) => setEditProfileData({...editProfileData, date_of_birth: e.target.value})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Language</Label>
              <Select 
                value={editProfileData.language} 
                onValueChange={(value) => setEditProfileData({...editProfileData, language: value})}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Timezone</Label>
              <Select 
                value={editProfileData.timezone} 
                onValueChange={(value) => setEditProfileData({...editProfileData, timezone: value})}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="Europe/Amsterdam">Amsterdam (CET)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                  <SelectItem value="America/New_York">New York (EST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Los Angeles (PST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsEditUserOpen(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateProfile}
                disabled={isSavingProfile}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSavingProfile ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
