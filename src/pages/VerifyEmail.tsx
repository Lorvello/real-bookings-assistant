import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
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
    // No email in route state (e.g. direct visit / refresh): redirect declaratively.
    // Calling navigate() during render triggers a React "update during render"
    // warning; <Navigate> is the correct, side-effect-free way to redirect.
    return <Navigate to="/login" replace />;
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