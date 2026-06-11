import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EmailVerificationPending } from '@/components/auth/EmailVerificationPending';
import { AuthShell } from '@/components/auth/AuthShell';

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
    <AuthShell>
      <EmailVerificationPending
        email={email}
        onBackToLogin={handleBackToLogin}
      />
    </AuthShell>
  );
};

export default VerifyEmail;