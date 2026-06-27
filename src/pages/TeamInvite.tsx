import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('auth');
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError(t('auth.teamInvite.noToken', 'No invitation token found'));
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
        setError(result?.error || t('auth.teamInvite.notFound', 'Invitation not found or expired'));
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
      setError(t('auth.teamInvite.loadError', 'Something went wrong while loading the invitation'));
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      // Accept via the edge fn: it creates the member's auth account (a member has none yet, and
      // public.users.id must reference auth.users) then links them to the calendar. A direct DB RPC
      // could not create the user (FK violation), which is why accepting used to fail.
      const { data, error } = await supabase.functions.invoke('accept-team-invitation', {
        body: { token },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || (data as { success?: boolean }).success !== true) {
        throw new Error((data as { error?: string })?.error || t('auth.teamInvite.acceptFailed', 'Failed to accept invitation'));
      }

      toast({
        title: t('auth.teamInvite.acceptedTitle', 'Invitation accepted! 🎉'),
        description: t('auth.teamInvite.acceptedDesc', 'Check your email for a link to set your password, then log in.'),
      });

      // Redirect to the login page with a success message.
      setTimeout(() => {
        navigate('/login?message=invitation-accepted&email=' + encodeURIComponent(invitation?.email || ''));
      }, 2500);

    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast({
        title: t('auth.teamInvite.errorTitle', 'Error'),
        description: err.message || t('auth.teamInvite.acceptError', 'Something went wrong while accepting the invitation.'),
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
              <span>{t('auth.teamInvite.loading', 'Loading invitation...')}</span>
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
            <CardTitle className="text-red-700">{t('auth.teamInvite.invalidTitle', 'Invalid invitation')}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/login')}
              variant="outline"
              className="w-full"
            >
              {t('auth.teamInvite.goToLogin', 'Go to login page')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const businessName = invitation.users?.business_name || invitation.users?.full_name || t('auth.teamInvite.teamFallback', 'The team');
  const expiresAt = new Date(invitation.expires_at);
  const timeUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)); // hours

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <UserPlus className="w-16 h-16 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl">{t('auth.teamInvite.title', 'Team invitation')}</CardTitle>
          <CardDescription>
            {t('auth.teamInvite.invitedToJoin', "You've been invited to join {{business}}", { business: businessName })}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">{t('auth.teamInvite.business', 'Business')}</h4>
              <p className="text-gray-600">{businessName}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{t('auth.teamInvite.calendar', 'Calendar')}</h4>
              <p className="text-gray-600">{invitation.calendars.name}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{t('auth.teamInvite.yourEmail', 'Your email')}</h4>
              <p className="text-gray-600">{invitation.email}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{t('auth.teamInvite.role', 'Role')}</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                invitation.role === 'editor'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {invitation.role === 'editor'
                  ? t('auth.teamInvite.roleEditor', 'Editor (can edit)')
                  : t('auth.teamInvite.roleViewer', 'Viewer (view only)')}
              </span>
            </div>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {t('auth.teamInvite.expiresPrefix', 'This invitation expires in')}{' '}
              <strong>
                {timeUntilExpiry === 1
                  ? t('auth.teamInvite.expiresHoursOne', '{{count}} hour', { count: timeUntilExpiry })
                  : t('auth.teamInvite.expiresHoursOther', '{{count}} hours', { count: timeUntilExpiry })}
              </strong>.{' '}
              {t('auth.teamInvite.expiresSuffix', 'Accept it as soon as possible to get access.')}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">{t('auth.teamInvite.whatYouGet', 'What do you get?')}</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t('auth.teamInvite.benefitCalendar', "Access to {{business}}'s calendar", { business: businessName })}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t('auth.teamInvite.benefitOwnCalendar', 'Your own personal calendar')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  {invitation.role === 'editor'
                    ? t('auth.teamInvite.benefitEditor', 'The ability to schedule and edit appointments')
                    : t('auth.teamInvite.benefitViewer', 'An overview of all scheduled appointments')}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t('auth.teamInvite.benefitCollaborate', 'Collaborate with the team')}</span>
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
                  {t('auth.teamInvite.accepting', 'Accepting...')}
                </>
              ) : (
                t('auth.teamInvite.accept', 'Accept invitation')
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="flex-1 sm:flex-initial"
            >
              {t('auth.teamInvite.later', 'Later')}
            </Button>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>{t('auth.teamInvite.privacyLabel', 'Privacy:')}</strong> {t('auth.teamInvite.privacyBody', 'By accepting this invitation, {{business}} will get access to your name and email address for team collaboration purposes.', { business: businessName })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamInvite;