
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

const GoogleCalendarCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Google Calendar connection...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        
        console.log('Google OAuth callback received:', { 
          code: code ? 'present' : 'missing', 
          state, 
          error,
          url: window.location.href 
        });

        if (error) {
          console.error('OAuth error:', error);
          setStatus('error');
          setMessage('Google authentication was denied or failed');
          setTimeout(() => {
            navigate('/profile?error=google_auth_denied');
          }, 3000);
          return;
        }
        
        if (!code || !state) {
          setStatus('error');
          setMessage('Invalid callback parameters - missing code or state');
          setTimeout(() => {
            navigate('/profile?error=invalid_callback');
          }, 3000);
          return;
        }
        
        setMessage('Exchanging tokens with Google...');
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setStatus('error');
          setMessage('User not authenticated');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        // Call the edge function to handle token exchange
        const { data, error: functionError } = await supabase.functions.invoke('google-calendar-oauth', {
          body: { code, state, user_id: user.id }
        });

        if (functionError) {
          console.error('Edge function error:', functionError);
          setStatus('error');
          setMessage('Failed to connect calendar - please try again');
          setTimeout(() => {
            navigate('/profile?error=connection_failed');
          }, 3000);
          return;
        }
        
        if (data?.success) {
          setStatus('success');
          setMessage('Successfully connected to Google Calendar!');
          setTimeout(() => {
            navigate('/profile?success=calendar_connected&provider=google');
          }, 2000);
        } else {
          console.error('Token exchange failed:', data);
          setStatus('error');
          setMessage(data?.error || 'Connection failed - please try again');
          setTimeout(() => {
            navigate('/profile?error=connection_failed');
          }, 3000);
        }
        
      } catch (error: any) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred');
        setTimeout(() => {
          navigate('/profile?error=unexpected_error');
        }, 3000);
      }
    };
    
    handleCallback();
  }, [searchParams, navigate]);

  const renderIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-12 w-12 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          {renderIcon()}
        </div>
        
        <h2 className={`text-xl font-semibold mb-2 ${getStatusColor()}`}>
          {status === 'processing' && 'Connecting to Google'}
          {status === 'success' && 'Connection Successful!'}
          {status === 'error' && 'Connection Failed'}
        </h2>
        
        <p className="text-gray-600 mb-4">{message}</p>
        
        {status !== 'processing' && (
          <p className="text-sm text-gray-500">Redirecting you back...</p>
        )}
      </div>
    </div>
  );
};

export default GoogleCalendarCallback;
