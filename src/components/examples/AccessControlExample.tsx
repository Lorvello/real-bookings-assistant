import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccessControl } from '@/hooks/useAccessControl';
import { AccessBlockedOverlay } from '@/components/user-status/AccessBlockedOverlay';
import { Lock, Plus, Edit, Share, Users } from 'lucide-react';

export function AccessControlExample() {
  const { userStatus, accessControl, requireAccess, withAccessControl } = useAccessControl();
  const [showOverlay, setShowOverlay] = useState(false);

  // Example of access-controlled actions
  const handleCreateBooking = withAccessControl(
    'canCreateBookings',
    () => {
      console.log('Creating new booking...');
      alert('Creating new booking!');
    },
    () => setShowOverlay(true)
  );

  const handleEditBooking = withAccessControl(
    'canEditBookings',
    () => {
      console.log('Editing booking...');
      alert('Editing booking!');
    },
    () => setShowOverlay(true)
  );

  const handleInviteUser = withAccessControl(
    'canInviteUsers',
    () => {
      console.log('Inviting user...');
      alert('Inviting user!');
    },
    () => setShowOverlay(true)
  );

  const handleExportData = () => {
    if (requireAccess('canExportData', () => setShowOverlay(true))) {
      console.log('Exporting data...');
      alert('Exporting data!');
    }
  };

  const getAccessIcon = (hasAccess: boolean) => {
    return hasAccess ? null : <Lock className="h-4 w-4 text-red-400" />;
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            User Status: {userStatus.userType}
            <span className={`px-2 py-1 rounded text-xs ${
              userStatus.statusColor === 'green' ? 'bg-green-900 text-green-300' :
              userStatus.statusColor === 'yellow' ? 'bg-yellow-900 text-yellow-300' :
              userStatus.statusColor === 'red' ? 'bg-red-900 text-red-300' :
              'bg-gray-700 text-gray-300'
            }`}>
              {userStatus.statusMessage}
            </span>
          </CardTitle>
          <CardDescription>
            Access control demonstration based on user subscription status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Create Booking */}
            <Button
              onClick={handleCreateBooking}
              disabled={!accessControl.canCreateBookings}
              className="flex items-center gap-2"
              variant={accessControl.canCreateBookings ? "default" : "outline"}
            >
              <Plus className="h-4 w-4" />
              Create Booking
              {getAccessIcon(accessControl.canCreateBookings)}
            </Button>

            {/* Edit Booking */}
            <Button
              onClick={handleEditBooking}
              disabled={!accessControl.canEditBookings}
              className="flex items-center gap-2"
              variant={accessControl.canEditBookings ? "default" : "outline"}
            >
              <Edit className="h-4 w-4" />
              Edit Booking
              {getAccessIcon(accessControl.canEditBookings)}
            </Button>

            {/* Export Data */}
            <Button
              onClick={handleExportData}
              disabled={!accessControl.canExportData}
              className="flex items-center gap-2"
              variant={accessControl.canExportData ? "default" : "outline"}
            >
              <Share className="h-4 w-4" />
              Export Data
              {getAccessIcon(accessControl.canExportData)}
            </Button>

            {/* Invite Users */}
            <Button
              onClick={handleInviteUser}
              disabled={!accessControl.canInviteUsers}
              className="flex items-center gap-2"
              variant={accessControl.canInviteUsers ? "default" : "outline"}
            >
              <Users className="h-4 w-4" />
              Invite Users
              {getAccessIcon(accessControl.canInviteUsers)}
            </Button>
          </div>

          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="font-semibold mb-2">Current Access Levels:</h3>
            <div className="text-sm space-y-1 text-gray-300">
              <div>Create Bookings: {accessControl.canCreateBookings ? '✅' : '❌'}</div>
              <div>Edit Bookings: {accessControl.canEditBookings ? '✅' : '❌'}</div>
              <div>WhatsApp: {accessControl.canAccessWhatsApp ? '✅' : '❌'}</div>
              <div>AI Features: {accessControl.canUseAI ? '✅' : '❌'}</div>
              <div>Export Data: {accessControl.canExportData ? '✅' : '❌'}</div>
              <div>Invite Users: {accessControl.canInviteUsers ? '✅' : '❌'}</div>
              <div>Max Calendars: {accessControl.maxCalendars}</div>
              <div>Max Bookings/Month: {accessControl.maxBookingsPerMonth}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Blocked Overlay */}
      {showOverlay && (
        <AccessBlockedOverlay
          userStatus={userStatus}
          feature="this feature"
          description="This feature requires an active subscription to use."
          onUpgrade={() => {
            setShowOverlay(false);
            console.log('Redirecting to upgrade...');
          }}
        />
      )}
    </div>
  );
}