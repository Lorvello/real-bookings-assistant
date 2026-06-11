import React from 'react';
import { PasswordResetConfirmForm } from '@/components/auth/PasswordResetConfirmForm';
import { AuthShell } from '@/components/auth/AuthShell';

const ResetPassword = () => {
  return (
    <AuthShell>
      <PasswordResetConfirmForm />
    </AuthShell>
  );
};

export default ResetPassword;