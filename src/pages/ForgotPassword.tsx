import React from 'react';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { AuthShell } from '@/components/auth/AuthShell';

const ForgotPassword = () => {
  return (
    <AuthShell>
      <PasswordResetForm />
    </AuthShell>
  );
};

export default ForgotPassword;