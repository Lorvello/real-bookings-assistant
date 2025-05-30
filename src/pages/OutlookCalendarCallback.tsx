
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

const OutlookCalendarCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing callback...');

  useEffect(() => {
    // Since we're using simplified OAuth flow through Supabase Auth,
    // Outlook callbacks should redirect through the normal auth flow
    setStatus('error');
    setMessage('Outlook Calendar integration is not available in this simplified flow');
    
    setTimeout(() => {
      navigate('/profile?error=outlook_not_supported');
    }, 3000);
  }, [navigate]);

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
          {status === 'processing' && 'Processing...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Not Supported'}
        </h2>
        
        <p className="text-gray-600 mb-4">{message}</p>
        
        {status !== 'processing' && (
          <p className="text-sm text-gray-500">Redirecting you back...</p>
        )}
      </div>
    </div>
  );
};

export default OutlookCalendarCallback;
