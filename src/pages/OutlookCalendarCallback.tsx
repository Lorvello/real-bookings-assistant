
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const OutlookCalendarCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connecting your Outlook Calendar...');

  useEffect(() => {
    const handleOutlookCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state'); // connection ID
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        setMessage('Exchanging authorization code for tokens...');

        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: import.meta.env.VITE_OUTLOOK_CLIENT_ID || '',
            client_secret: import.meta.env.VITE_OUTLOOK_CLIENT_SECRET || '',
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: `${window.location.origin}/auth/outlook/callback`,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange authorization code');
        }

        const tokens = await tokenResponse.json();

        if (tokens.error) {
          throw new Error(`Token exchange error: ${tokens.error}`);
        }

        setMessage('Getting user information...');

        // Get user info from Microsoft Graph
        const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        });

        if (!userInfoResponse.ok) {
          throw new Error('Failed to get user information');
        }

        const userInfo = await userInfoResponse.json();

        setMessage('Saving connection to database...');

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Update the connection record with tokens and user info
        const { error: updateError } = await supabase
          .from('calendar_connections')
          .update({
            provider_account_id: userInfo.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', state)
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }

        setStatus('success');
        setMessage('Outlook Calendar connected successfully!');

        toast({
          title: "Success",
          description: "Your Outlook Calendar has been connected successfully.",
        });

        // Redirect back to profile after a short delay
        setTimeout(() => {
          navigate('/profile?calendar_connected=outlook');
        }, 2000);

      } catch (error: any) {
        console.error('Outlook Calendar callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to connect Outlook Calendar');

        toast({
          title: "Connection Failed",
          description: error.message || 'Failed to connect Outlook Calendar',
          variant: "destructive",
        });

        // Redirect back to profile after a short delay
        setTimeout(() => {
          navigate('/profile?calendar_error=outlook');
        }, 3000);
      }
    };

    handleOutlookCallback();
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-6">
          {status === 'processing' && (
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto" />
          )}
          {status === 'success' && (
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          )}
          {status === 'error' && (
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto" />
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {status === 'processing' && 'Connecting Outlook Calendar'}
          {status === 'success' && 'Connection Successful!'}
          {status === 'error' && 'Connection Failed'}
        </h1>
        
        <p className="text-gray-600 mb-4">{message}</p>
        
        {status === 'processing' && (
          <p className="text-sm text-gray-500">
            Please wait while we complete the connection...
          </p>
        )}
        
        {status === 'success' && (
          <p className="text-sm text-gray-500">
            Redirecting you back to your dashboard...
          </p>
        )}
        
        {status === 'error' && (
          <button
            onClick={() => navigate('/profile')}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Return to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default OutlookCalendarCallback;
