
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
import { UserPlus, Edit, Trash2, Crown, User, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const UserManagement = () => {
  const { selectedCalendar, calendars } = useCalendarContext();
  const { members, loading, inviteMember, removeMember, updateMemberRole } = useCalendarMembers(selectedCalendar?.id || '');
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'editor' | 'viewer'>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCalendar?.id) {
      toast({
        title: "Calendar required",
        description: "Please select a calendar to add a user to",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteMember(newUserEmail, newUserRole, newUserName);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('viewer');
      setIsAddUserOpen(false);
    } finally {
      setIsSubmitting(false);
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

  return (
    <Card className="border-gray-700 bg-gray-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">Users Management</CardTitle>
          <p className="text-sm text-gray-400 mt-1">
            {selectedCalendar 
              ? `Manage who has access to your calendar "${selectedCalendar.name}"`
              : "Select a calendar to manage users or add new team members"}
          </p>
        </div>
        
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              disabled={calendars.length === 0}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Add New User</DialogTitle>
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
              <div>
                <Label className="text-gray-300">Calendar</Label>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedCalendar
                    ? `User will be added to "${selectedCalendar.name}"`
                    : "Please select a calendar first"}
                </p>
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
                  disabled={isSubmitting || !selectedCalendar}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Adding...' : 'Add User'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current User (Account Owner) */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-white font-medium">{profile?.full_name || 'Account Owner'}</p>
                    <p className="text-sm text-gray-400">{profile?.email}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-yellow-900/30 text-yellow-400 border-yellow-700">
                  Account Owner
                </Badge>
              </div>
              <div className="mt-3 text-sm text-gray-400">
                <p>• Access to all {calendars.length} calendar{calendars.length !== 1 ? 's' : ''}</p>
                <p>• Full administrative privileges</p>
              </div>
            </div>

            {/* Team Members */}
            {selectedCalendar ? (
              members.length > 0 ? (
                <div>
                  <h4 className="text-white font-medium mb-3">Team Members</h4>
                  <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-300">User</TableHead>
                          <TableHead className="text-gray-300">Role</TableHead>
                          <TableHead className="text-gray-300">Access</TableHead>
                          <TableHead className="text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id} className="border-gray-700">
                            <TableCell>
                              <div>
                                <p className="text-white font-medium">
                                  {member.user?.full_name || 'Unknown User'}
                                </p>
                                <p className="text-sm text-gray-400">{member.user?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getRoleIcon(member.role)}
                                <span className="text-gray-300">{getRoleName(member.role)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-gray-400">
                                Calendar: {selectedCalendar.name}
                              </p>
                            </TableCell>
                            <TableCell>
                              {member.role !== 'owner' && (
                                <div className="flex items-center space-x-2">
                                  <Select
                                    value={member.role}
                                    onValueChange={(value: 'editor' | 'viewer') => handleRoleChange(member.id, value)}
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
                                    onClick={() => handleRemoveUser(member.id)}
                                    className="h-8 px-2 border-red-700 text-red-400 hover:bg-red-900/30"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No team members yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Invite team members to collaborate on your calendar
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Select a calendar to manage team members</p>
                <p className="text-sm text-gray-500 mt-1">
                  You can add users once you've selected a calendar
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
