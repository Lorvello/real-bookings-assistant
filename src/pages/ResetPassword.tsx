import React from 'react';
import { PasswordResetConfirmForm } from '@/components/auth/PasswordResetConfirmForm';

const ResetPassword = () => {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#2C3E50' }}>
      <PasswordResetConfirmForm />
    </div>
  );
};

export default ResetPassword;