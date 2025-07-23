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
      setError('Geen uitnodigingstoken gevonden');
      setLoading(false);
      return;
    }

    fetchInvitationData();
  }, [token]);

  const fetchInvitationData = async () => {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select(`
          *,
          calendars!inner(name, user_id),
          users!team_invitations_invited_by_fkey(business_name, full_name)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('Uitnodiging niet gevonden of verlopen');
        return;
      }

      setInvitation(data as unknown as InvitationData);
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError('Er ging iets mis bij het ophalen van de uitnodiging');
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
        title: "Uitnodiging geaccepteerd! 🎉",
        description: "Je hebt nu toegang tot het team. Je wordt doorgestuurd naar het inlogscherm.",
      });

      // Redirect to login page with success message
      setTimeout(() => {
        navigate('/auth?message=invitation-accepted&email=' + encodeURIComponent(invitation?.email || ''));
      }, 2000);

    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      toast({
        title: "Fout",
        description: err.message || "Er ging iets mis bij het accepteren van de uitnodiging.",
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
              <span>Uitnodiging laden...</span>
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
            <CardTitle className="text-red-700">Uitnodiging Ongeldig</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')} 
              variant="outline" 
              className="w-full"
            >
              Ga naar inlogpagina
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const businessName = invitation.users?.business_name || invitation.users?.full_name || 'Het team';
  const expiresAt = new Date(invitation.expires_at);
  const timeUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)); // hours

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <UserPlus className="w-16 h-16 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl">Team Uitnodiging</CardTitle>
          <CardDescription>
            Je bent uitgenodigd om deel te nemen aan {businessName}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Bedrijf</h4>
              <p className="text-gray-600">{businessName}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Kalender</h4>
              <p className="text-gray-600">{invitation.calendars.name}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Jouw email</h4>
              <p className="text-gray-600">{invitation.email}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Rol</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                invitation.role === 'editor' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {invitation.role === 'editor' ? 'Editor (Kan bewerken)' : 'Viewer (Alleen bekijken)'}
              </span>
            </div>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Deze uitnodiging verloopt over <strong>{timeUntilExpiry} uur</strong>. 
              Accepteer zo snel mogelijk om toegang te krijgen.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Wat krijg je?</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Toegang tot de agenda van {businessName}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Je eigen persoonlijke kalender</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  {invitation.role === 'editor' 
                    ? 'Mogelijkheid om afspraken in te plannen en te bewerken'
                    : 'Overzicht van alle geplande afspraken'
                  }
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Samenwerken met het team</span>
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
                  Accepteren...
                </>
              ) : (
                'Uitnodiging Accepteren'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="flex-1 sm:flex-initial"
            >
              Later
            </Button>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>Privacy:</strong> Door deze uitnodiging te accepteren, krijgt {businessName} toegang 
            tot je naam en e-mailadres voor teamsamenwerkingsdoeleinden.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamInvite;