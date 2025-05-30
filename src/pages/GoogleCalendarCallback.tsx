
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

const GoogleCalendarCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connecting to Google Calendar...');
  
  // Get user
  const [user, setUser] = useState(null);
  const { handleOAuthCallback } = useCalendarIntegration(user);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        
        console.log('Google OAuth callback:', { code: code?.substring(0, 10) + '...', state, error });

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
          setMessage('Invalid callback parameters');
          setTimeout(() => {
            navigate('/profile?error=invalid_callback');
          }, 3000);
          return;
        }
        
        setMessage('Exchanging tokens...');
        
        const success = await handleOAuthCallback(code, state, 'google');
        
        if (success) {
          setStatus('success');
          setMessage('Successfully connected to Google Calendar!');
          setTimeout(() => {
            navigate('/profile?success=calendar_connected&provider=google');
          }, 2000);
        } else {
          throw new Error('Token exchange failed');
        }
        
      } catch (error: any) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage('Connection failed. Please try again.');
        setTimeout(() => {
          navigate('/profile?error=connection_failed');
        }, 3000);
      }
    };
    
    handleCallback();
  }, [user, searchParams, navigate, handleOAuthCallback]);

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
