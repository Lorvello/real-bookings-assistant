import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, AlertTriangle, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvitationData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  expires_at: string;
  calendars: {
    name: string;
    user_id: string;
  };
  users: {
    business_name: string;
    full_name: string;
  } | null;
}

const TeamInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No invitation token found');
      setLoading(false);
      return;
    }

    fetchInvitationData();
  }, [token]);

  const fetchInvitationData = async () => {
    try {
      // Read via a SECURITY DEFINER RPC keyed on the token. The invitee is ANONYMOUS (no account
      // yet), so a direct table query is blocked by RLS ("view invitations sent to your email"
      // needs auth.email()), which made every valid invite show "Invalid invitation". The token is
      // the unguessable capability, so the RPC safely returns the one matching pending invite.
      // Cast: this RPC was just added (migration R39) and isn't in the generated Supabase types yet.
      // Regenerate src/integrations/supabase/types.ts to drop the `as any`.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_team_invitation_by_token', { p_token: token });

      const result = data as { success?: boolean; error?: string; invitation?: Record<string, unknown> } | null;
      if (error || !result || result.success !== true || !result.invitation) {
        setError(result?.error || 'Invitation not found or expired');
        return;
      }

      const inv = result.invitation as {
        id: string; email: string; full_name: string; role: string; status: string;
        expires_at: string; calendar_name: string; business_name: string;
      };
      setInvitation({
        id: inv.id,
        email: inv.email,
        full_name: inv.full_name,
        role: inv.role,
        status: inv.status,
        expires_at: inv.expires_at,
        calendars: { name: inv.calendar_name, user_id: '' },
        users: { business_name: inv.business_name, full_name: inv.business_name },
      });
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError('Something went wrong while loading the invitation');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc('accept_team_invitation', {
        p_token: token
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || typeof data !== 'object' || !(data as any).success) {
        throw new Error((data as any)?.error || 'Failed to accept invitation');
      }

      toast({
        title: "Invitation accepted! 🎉",
        description: "You now have access to the team. You'll be redirected to the login screen.",
      });

      // Redirect to login page with success message
      setTimeout(() => {
        navigate('/login?message=invitation-accepted&email=' + encodeURIComponent(invitation?.email || ''));
      }, 2000);

    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong while accepting the invitation.",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Loading invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-700">Invalid invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/login')} 
              variant="outline" 
              className="w-full"
            >
              Go to login page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const businessName = invitation.users?.business_name || invitation.users?.full_name || 'The team';
  const expiresAt = new Date(invitation.expires_at);
  const timeUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)); // hours

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <UserPlus className="w-16 h-16 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl">Team invitation</CardTitle>
          <CardDescription>
            You've been invited to join {businessName}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Business</h4>
              <p className="text-gray-600">{businessName}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Calendar</h4>
              <p className="text-gray-600">{invitation.calendars.name}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Your email</h4>
              <p className="text-gray-600">{invitation.email}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Role</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                invitation.role === 'editor' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {invitation.role === 'editor' ? 'Editor (can edit)' : 'Viewer (view only)'}
              </span>
            </div>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              This invitation expires in <strong>{timeUntilExpiry} hours</strong>.
              Accept it as soon as possible to get access.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">What do you get?</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Access to {businessName}'s calendar</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Your own personal calendar</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  {invitation.role === 'editor'
                    ? 'The ability to schedule and edit appointments'
                    : 'An overview of all scheduled appointments'
                  }
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Collaborate with the team</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={acceptInvitation}
              disabled={accepting}
              className="flex-1"
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Accepting...
                </>
              ) : (
                'Accept invitation'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/login')}
              className="flex-1 sm:flex-initial"
            >
              Later
            </Button>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>Privacy:</strong> By accepting this invitation, {businessName} will get access
            to your name and email address for team collaboration purposes.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamInvite;