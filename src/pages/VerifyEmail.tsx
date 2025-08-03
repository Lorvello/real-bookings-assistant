import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EmailVerificationPending } from '@/components/auth/EmailVerificationPending';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email] = useState(location.state?.email || '');

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (!email) {
    // If no email provided, redirect to login
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#2C3E50' }}>
      <EmailVerificationPending 
        email={email}
        onBackToLogin={handleBackToLogin}
      />
    </div>
  );
};

export default VerifyEmail;